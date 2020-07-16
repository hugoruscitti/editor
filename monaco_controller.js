class MonacoController extends Stimulus.Controller {
  static get targets() {
    return []
  }

  connect() {

      require.config({ paths: { 'vs': 'monaco-editor/min/vs' }});
      require(['vs/editor/editor.main'], () => {
        var editor = monaco.editor.create(this.element, {
          value: this.obtenerCodigo(),
          theme: "vs-dark",
          minimap: { enabled: false },
          language: "typescript",
          fontSize: 20,
    	    contextmenu: false,
        });

        window.onresize = function() {
          editor.layout();
        };

        window.editor = editor;
      });

  }

  obtenerCodigo() {
    return `declare function print(nombre: string): any;

    class Actor {
      contador: number = 0;

      iniciar() {
        print("hola");
      }

      actualizar() {
        this.contador += 1;
        print("El contador vale " + this.contador);

        if (this.contador > 3) {
          print("El contador supera el número 3!");

          if (this.contador > 5) {
            print("Regresando el contandor a 0");
            this.contador = 0;
          }
        } else {
          print("continuando...");
        }
      }
    }
    `.trim();
  }
}
