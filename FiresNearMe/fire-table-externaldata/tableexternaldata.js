(function () {
    let tmpl = document.createElement('template');
    tmpl.innerHTML = `
        <style>
            th, td, p, input {
                font:14px Verdana;
            }

            th, td {
                padding: 5px 10px;
            }

            th {
                font-weight:bold;
                position:sticky;
                top:0;
                background-color: #e5281b;
                color: white;
            }

            th.des:after {
                content: "\\2193";
            }
         
            th.aes:after {
                content: "\\2191";
            }

            #showData {
                height: 100%;
                width: 100%;
                overflow: auto;
                /* margin-top:20px; */
            }

            tr, td > * {
                vertical-align: middle;
                cursor: pointer;
            }

            tr.selected {    
                border: 2px solid #9ecaed;
                border-radius: 7px;
                outline: none;
                box-shadow: 0 0 10px #9ecaed;
            }

            td > img {
                padding-right: 3px;
            }

            tr:nth-child(even) {
                background-color: #f0f0f0;
            }

        </style>
        <div id="showData"></div>
    `;

    class FireTableExternal extends HTMLElement {
        constructor() {
            super();
            this._shadowRoot = this.attachShadow({ mode: "open" });
            this._shadowRoot.appendChild(tmpl.content.cloneNode(true));
            this._d3 = d3v5;
            this._d3Props = {};
            this.$div = this._shadowRoot.querySelector('div');
        }

        //Fired when the widget is added to the html DOM of the page
        connectedCallback() {
        }

        //Fired when the widget is removed from the html DOM of the page (e.g. by hide)
        disconnectedCallback() {

        }

        setActiveRow(rowGUID) {
            this._selectedRow = null;

            this._rows.filter((d) => d["guid"] == rowGUID).each((d, i, nodes) => {
                this._selectedRow = d;
                nodes[i].scrollIntoView();
            });
        }

        getActiveRow() {
            return JSON.stringify(this._selectedRow || null);
        }

        drawTable(data) {
            let shadowrootD3 = this._d3.select(this.$div);

            var sort = {
                accending: false,
                column: 'UPDATED'
            }

            if(this.table) {
                this.table.select('thead').selectAll('tr').select('th.aes,th.des').call((sortColumn) => {
                    sort.accending = sortColumn.classed("aes");
                    sort.column = sortColumn.datum();
                });

                this.table.remove();
            }

            this.table = shadowrootD3.append('table');

            let selectecColumns = ['ALERT LEVEL','LOCATION','COUNCIL AREA','STATUS','TYPE','FIRE','SIZE','RESPONSIBLE AGENCY','UPDATED'];
            var titles = d3.keys(data[0]).filter((d) => {
                return selectecColumns.indexOf(d) > -1;
            });

            var headers = this.table.append('thead').append('tr')
                            .selectAll('th')
                            .data(titles).enter()
                            .append('th')
                            .attr('class', (column) => {
                                return column == sort.column ? (sort.accending ? 'aes' : 'des') : '';
                            })
                            .text((column) => column);

            
            this._rows = this.table.append('tbody').selectAll('tr')
                        .data(data)
                        .enter()
                        .append('tr')
                        .on('click', (dataRow, i, nodes) => {
                            this._selectedRow = dataRow;

                            const event = new Event("onRowSelect");
                            this.dispatchEvent(event);
                        });

            let sortHandler = (column) => {
                let sortFunc = sort.accending ? d3.ascending : d3.descending;

                this._rows.sort((a, b) => {

                    if(column == "UPDATED") {
                        let aDate = new Date(a[column]);
                        let bDate = new Date(b[column]);
                        return sortFunc(aDate, bDate);
                    } else if(column == "SIZE") {
                        let aNumber = a[column].match(/\d+/g);
                        let bNumber = b[column].match(/\d+/g);
                        return sortFunc(parseInt(aNumber[0]), parseInt(bNumber[0])); 
                    } else {
                        return sortFunc(a[column], b[column]); 
                    }
                });
            };

            sortHandler(sort.column);

            headers.on('click', (column, i, nodes) => {
                headers.attr('class', '');

                sortHandler(column);
                
                nodes[i].className = sort.accending ? 'aes' : 'des';

                sort.accending = !sort.accending;
            });

            var tds = this._rows.selectAll('td')
                .data(function (d) {
                    return titles.map(function (k) {
                        return { 'value': d[k], 'column': k};
                    });
                }).enter()
                .append('td')
                .attr('data-th', function (d) {
                    return d.column;
                })
            
            tds.insert('span')
                .text(function (d) {
                    return d.value;
                });
            
            let AlertLevelDecorations = {
                "Advice": {
                    color: "#3b52a3",
                    icon: "https://www.rfs.nsw.gov.au/_designs/geojson/fires-near-me/images/advice.png"
                },
                "Emergency Warning": {
                    color: "#ed1d24",
                    icon: "https://www.rfs.nsw.gov.au/_designs/geojson/fires-near-me/images/emergency-warning.png"
                },
                "Watch and Act": {
                    color: "#f3ed33",
                    icon: "https://www.rfs.nsw.gov.au/_designs/geojson/fires-near-me/images/watch-and-act.png"
                },
                "Not Applicable": {
                    color: null,
                    icon: "https://www.rfs.nsw.gov.au/_designs/geojson/fires-near-me/images/not-applicable.png"
                }
            }

            tds.filter((d) => {
                return d.column == "ALERT LEVEL"
            })
                .style("color", (d) => AlertLevelDecorations[d.value].color)
                .insert("img", ":first-child")
                .attr("src", (d) => AlertLevelDecorations[d.value].icon);
        }

        setData(parsedData) {
            let JSONData = JSON.parse(parsedData || "null");

            if (JSONData) this.drawTable(JSONData);
        }

        //When the custom widget is updated, the Custom Widget SDK framework executes this function first
        onCustomWidgetBeforeUpdate(oChangedProperties) {
        }

        //When the custom widget is updated, the Custom Widget SDK framework executes this function after the update
        onCustomWidgetAfterUpdate(oChangedProperties) {
        }
    }

    //SHARED FUNCTION: reuse between widgets
	function loadScript(src, callback) {

		let customElementScripts = window.sessionStorage.getItem("customElementScripts") || [];

		let scriptStatus = customElementScripts.find(function(element) {
			return element.src == scriptSrc;
		});

		if(document.querySelector('script[src="' + src + '"]') && !scriptStatus) {
            //unmanaged load
            
            let scriptElement = document.querySelector('script[src="' + src + '"]');
            let existingOnLoad = scriptElement.onload;
            scriptElement.onload = function(){
                existingOnLoad();
                callback();
            }
		} else if (scriptStatus) {
			if(scriptStatus.status == "ready") {
				callback();
			} else {
				scriptStatus.callbacks.push(callback);
			}
		} else {

			let scriptObject = {
				"src": src,
				"status": "loading",
				"callbacks": [callback]
			}

			customElementScripts.push(scriptObject);

			var script = document.createElement("script");
			script.type = "text/javascript";
			script.src = src;
			script.onload = function(){
				scriptObject.status = "ready";
				scriptObject.callbacks.forEach((callbackFn) => callbackFn.call());
			};
			document.head.appendChild(script);
		}
    };
    
    function loadScripts(srcArray, callback) {
        let loading = srcArray.length;

        let onLoad = () => {
            if(--loading == 0) callback();
        };

        srcArray.forEach((scriptSrc) => {
            loadScript(scriptSrc, onLoad);
        })
    };

    //END SHARED FUNCTION
    

	loadScripts(["https://widgetdatasource.s3-ap-southeast-2.amazonaws.com/d3/d3v5.js"], () => customElements.define('com-sap-sample-firetable-externaldata', FireTableExternal));
})();
