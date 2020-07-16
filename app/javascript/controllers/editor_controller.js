import { Controller } from "stimulus";

export default class extends Controller {
  static targets = ["consola", "botonDetener", "botonEjecutar"];

  connect() {
    this.decorations = [];
    this.ejecutando = false;
    this.lineasParaResaltar = [];

    window.print = mensaje => {
      this.imprimirMensaje(mensaje);
    };

    window.resaltarLinea = numero => {
      this.resaltarLinea(numero);
    };
  }

  resaltarLinea(numero) {
    this.lineasParaResaltar.push(numero);
  }

  resaltarTodasLasLineasPlanificadas() {
    let listado = this.lineasParaResaltar.map(numero => {
      return {
        range: new monaco.Range(numero, 1, numero, 1),
        options: {
          isWholeLine: true,
          className: "linea"
        }
      };
    });

    this.decorations = editor.deltaDecorations(this.decorations, listado);
  }

  limpiarResaltado() {
    let rango = new monaco.Range(1, 1, 1, 1);
    this.lineasParaResaltar = [];

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

    //versión instrumentada
    let ast_instrumentado = this.instrumentar(código_ts + "\n new Actor();");
    let código_instrumentado = this.convertirASTEnCódigo(ast_instrumentado);

    let código_javascript = ts.transpile(código_instrumentado);

    this.limpiarConsola();
    this.imprimirMensaje("Comenzando ejecución:");

    let actor = eval(código_javascript);

    actor.iniciar();
    this.resaltarTodasLasLineasPlanificadas();

    var actualizar_el_actor = () => {
      this.limpiarResaltado();

      if (this.ejecutando) {
        actor.actualizar();
        this.resaltarTodasLasLineasPlanificadas();
        setTimeout(actualizar_el_actor, 1000);
      }
    };

    setTimeout(actualizar_el_actor, 1000);
  }

  convertirASTEnCódigo(ast) {
    const printer = ts.createPrinter();
    return printer.printFile(ast);
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

  transformar() {
    let código = editor.getModel().getValue();
    let resultado = this.instrumentar(código);
    const printer = ts.createPrinter();

    this.limpiarConsola();
    print(printer.printFile(resultado));
  }

  instrumentar(código) {
    let sourceFile = ts.createSourceFile(
      "codigo.ts",
      código, // código
      ts.ScriptTarget.ES2015,
      true,
      ts.ScriptKind.TS
    );

    let transformer = context => rootNode => {
      function visit(node) {
        if (ts.isExpressionStatement(node)) {
          let linea = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

          let funcion = ts.createIdentifier("resaltarLinea");
          let params = [ts.createNumericLiteral(`${linea}`), ts.createStringLiteral("codigo.ts")];
          let nuevo = ts.createExpressionStatement(ts.createCall(funcion, undefined, params));

          return ts.createNodeArray([nuevo, node], false);
        }

        return ts.visitEachChild(node, visit, context);
      }
      return ts.visitNode(rootNode, visit);
    };

    const result = ts.transform(sourceFile, [transformer]);
    const resultado = result.transformed[0];

    return resultado;
  }
}
