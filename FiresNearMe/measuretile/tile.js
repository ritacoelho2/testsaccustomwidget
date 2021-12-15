(function () {
    let tmpl = document.createElement('template');
    tmpl.innerHTML = `
    <style>
    .label {
      font-family: "Arial";
      font-size: 20px;
      color: black;
    }

    .value {
      font-family: "Arial";
      font-size: 30px;
      color: black;
    }

    </style>
    <div class="value"></div>
    <div class="label"></div>
    `;

    customElements.define('com-sap-sample-measuretile', class MeasureTile extends HTMLElement {


        constructor() {
            super();
            this._shadowRoot = this.attachShadow({ mode: "open" });
            this._shadowRoot.appendChild(tmpl.content.cloneNode(true));
            this._firstConnection = false;
            this.$label = this._shadowRoot.querySelector('.label');
            this.$value = this._shadowRoot.querySelector('.value');
            this._props = {};
        }

        //Fired when the widget is added to the html DOM of the page
        connectedCallback() {
            this._firstConnection = true;
            this.render();
        }

        //Fired when the widget is removed from the html DOM of the page (e.g. by hide)
        disconnectedCallback() {

        }
        
        setData(dataJSON, dimName, dimValueJSON, type) {
            let dimValue = JSON.parse(dimValueJSON);
            let data = JSON.parse(dataJSON);

            var counter = 0;

            if(type == "COUNT") {
                for (var i = 0; i < data.features.length; i++) {
                    var str = data.features[i].properties["description"];
                    var res = str.split("<br />");
                    var item = res.find((e) => e.includes(dimName));
                    var index = item.indexOf(':');
                    var key = item.slice(0, index).trim();
                    var value = item.slice(index + 1).trim();

                    if ((dimName ? key == dimName : true) && (dimValue?.length ? dimValue.indexOf(value) > -1 : true)) {
                        counter += 1;
                    }
                }
            } else if (type == "COUNT DISTINCT") {
                let counted = [];

                for (var i = 0; i < data.features.length; i++) {
                    var str = data.features[i].properties["description"];
                    var res = str.split("<br />");
                    var item = res.find((e) => e.includes(dimName));
                    var index = item.indexOf(':');
                    var key = item.slice(0, index).trim();
                    var value = item.slice(index + 1).trim();

                    if ((dimName ? key == dimName : false) && !counted.includes(value)) {
                        counted.push(value);
                        counter += 1;
                    }
                }
            } else if (type == "SUM" && dimValue?.pattern) {
                let pattern = new RegExp(dimValue.pattern, 'g');

                for (var i = 0; i < data.features.length; i++) {
                    var str = data.features[i].properties["description"];
                    var res = str.split("<br />");
                    var item = res.find((e) => e.includes(dimName));
                    var index = item.indexOf(':');
                    var key = item.slice(0, index).trim();
                    var value = item.slice(index + 1).trim();

                    if (key == dimName) {
                        let numbers = value.match(pattern);
                        counter += parseInt(numbers[0]);
                    }
                }
            }



            this._dimName = dimName;
            this._measure = counter;

            this.render();
        }

        render() {
            this.$value.innerHTML = this._measure || "0";
            this.$label.innerHTML = this._props['label'] || "N/A";
        }

        //When the custom widget is updated, the Custom Widget SDK framework executes this function first
        onCustomWidgetBeforeUpdate(changedProperties) {
            this._props = { ...this._props, ...changedProperties };
        }

        //When the custom widget is updated, the Custom Widget SDK framework executes this function after the update
        onCustomWidgetAfterUpdate(changedProperties) {
            this.render();
        }
    });
})();
