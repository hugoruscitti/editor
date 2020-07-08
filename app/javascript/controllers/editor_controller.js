import { Controller } from "stimulus";

export default class extends Controller {
  static targets = ["consola", "botonDetener", "botonEjecutar"];

  connect() {
    this.decorations = [];
    this.ejecutando = false;

    window.print = mensaje => {
      this.imprimirMensaje(mensaje);
    };

    window.resaltarLinea = numero => {
      this.resaltarLinea(numero);
    };
  }

  resaltarLinea(numero) {
    var decorations = editor.deltaDecorations(this.decorations, [
      {
        range: new monaco.Range(numero, 1, numero, 1),
        options: {
          isWholeLine: true,
          className: "linea"
        }
      }
    ]);

    this.decorations = decorations;
  }

  limpiarResaltado() {
    let rango = new monaco.Range(1, 1, 1, 1);

    editor.deltaDecorations(this.decorations, [
      {
        range: rango,
        options: {}
      }
    ]);
  }

  alternarBotones() {
    this.botonEjecutarTarget.classList.toggle("dn");
    this.botonDetenerTarget.classList.toggle("dn");
  }

  ejecutar() {
    this.ejecutando = true;
    this.alternarBotones();

    this.resaltarLinea(3);

    let código_ts = editor.getModel().getValue();

    // versión sin instrumentar
    // let código_javascript = ts.transpile(código_ts + "\n new Actor();");

    //versión instrumentada
    let código_instrumentado = this.instrumentar(código_ts + "\n new Actor();", true);
    let código_javascript = ts.transpile(código_instrumentado);

    // reemplaza la instrumentación de comentarios por llamadas a la función
    // resaltarLinea.
    código_javascript = código_javascript.replace(/\"\[linea:(\d+)\]\"/g, "resaltarLinea($1)");

    this.limpiarConsola();
    this.imprimirMensaje("Comenzando ejecución:");

    let actor = eval(código_javascript);

    actor.iniciar();

    var actualizar_el_actor = () => {
      if (this.ejecutando) {
        actor.actualizar();
        setTimeout(actualizar_el_actor, 1000);
      }
    };

    setTimeout(actualizar_el_actor, 1000);
  }

  detener() {
    this.ejecutando = false;
    this.alternarBotones();
    this.limpiarResaltado();

    this.imprimirMensaje("Deteniendo");
  }

  limpiarConsola() {
    this.consolaTarget.innerHTML = "";
  }

  imprimirMensaje(mensaje) {
    if (this.consolaTarget.innerHTML) {
      this.consolaTarget.innerHTML = `${this.consolaTarget.innerHTML}\n${mensaje}`;
    } else {
      this.consolaTarget.innerHTML = mensaje;
    }
  }

  ast(event) {
    let codigo = editor.getModel().getValue();
    let raiz = ts.createSourceFile("codigo.js", codigo);
    let soloSentencias = event.currentTarget.dataset.soloSentencias === "true";

    this.limpiarConsola();

    function esSentencia(nodo) {
      return ts.SyntaxKind[nodo.kind] === "ExpressionStatement";
    }

    function convertirEnTexto(nodo, indent) {
      return new Array(indent * 2 + 1).join(" ") + ts.SyntaxKind[nodo.kind];
    }

    let indent = 0;

    function recorrerNodo(nodo) {
      let mensaje = convertirEnTexto(nodo, indent);

      if (esSentencia(nodo)) {
        if (nodo.getText(raiz)) {
          mensaje += `  →  ${nodo.getText(raiz)}`;
        }
      }

      if (soloSentencias) {
        if (esSentencia(nodo)) {
          print(mensaje);
        }
      } else {
        print(mensaje);
      }

      indent++;
      ts.forEachChild(nodo, recorrerNodo);
      indent--;
    }

    recorrerNodo(raiz);
  }

  transformar() {
    let código = editor.getModel().getValue();
    let resultado = this.instrumentar(código, false);
    const printer = ts.createPrinter();

    this.limpiarConsola();
    print(printer.printFile(resultado));
  }

  instrumentar(código, convertirElCódigoATexto) {
    let sourceFile = ts.createSourceFile(
      "codigo.ts",
      código, // código
      ts.ScriptTarget.ES2015,
      true,
      ts.ScriptKind.TS
    );

    const additionalSource = ts.createSourceFile(
      "ownerCheck.js",
      "resaltar_codigo();", // código
      ts.ScriptTarget.ES5,
      false,
      ts.ScriptKind.JS
    );

    let transformer = context => rootNode => {
      function visit(node) {
        if (ts.isExpressionStatement(node)) {
          let linea = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
          let nuevo = ts.createExpressionStatement(ts.createLiteral(`[linea:${linea}]`));

          return ts.createNodeArray([nuevo, node], false);
        }

        return ts.visitEachChild(node, visit, context);
      }
      return ts.visitNode(rootNode, visit);
    };

    const result = ts.transform(sourceFile, [transformer]);
    const resultado = result.transformed[0];

    if (convertirElCódigoATexto) {
      const printer = ts.createPrinter();
      return printer.printFile(resultado);
    } else {
      return resultado;
    }
  }
}
