import { Controller } from "stimulus";

export default class extends Controller {
  static targets = ["consola"];

  connect() {
    this.decorations = [];

    window.print = mensaje => {
      this.imprimirMensaje(mensaje);
    };
  }

  resaltar() {
    this.restaltarLinea(2);
  }

  restaltarLinea(numero) {
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

  ejecutar() {
    let código_ts = editor.getModel().getValue();
    let código_javascript = ts.transpile(código_ts);

    this.limpiarConsola();
    this.imprimirMensaje("Comenzando ejecución:");

    eval(código_javascript);
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
      return (ts.SyntaxKind[nodo.kind] === "ExpressionStatement");
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
        print(mensaje);
      } else {
        if (esSentencia(nodo)) {
          print(mensaje);
        }
      }

      indent++;
      ts.forEachChild(nodo, recorrerNodo);
      indent--;
    }

    recorrerNodo(raiz);
  }
}
