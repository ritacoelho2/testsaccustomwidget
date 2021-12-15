(function()  {
    let tmpl = document.createElement('template');
    tmpl.innerHTML = `
		<link rel="stylesheet" href="https://widgetdatasource.s3-ap-southeast-2.amazonaws.com/multiselect/multiselect.css"/>
        <style>
            .datasource {
                width: 100%;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .datasource > div {
                display: inline-block;
                vertical-align: middle;
            }

            .data-age, .refresh-timer {
                margin: 0px 12px;
            }

            .data-age > * {
                display: inline-block;
                vertical-align: middle;
            }

            .refresh-timer > * {
                display: inline-block;
                vertical-align: middle;
            }
            
            .filters {
                margin-left: auto;
                position: relative;
            }

            .filters > div {
                display: inline-block;
                margin: 0px 6px;
            }

            .filters > div > .filter-label {
                text-transform: capitalize;
            }

            .multiselect-input {
                box-sizing: border-box;
            }
        </style>
        <div class="datasource">
            <div class="data-age">
                <div class="label">Last Refreshed:</div>
                <div class="value">Loading</div>
            </div>
            <div class="refresh-timer">
                <div class="label">Next Refresh:</div>
                <div class="value">Never</div>
                <button id="refresh">Refresh Now</button>
            </div>
            <div class="filters">
                <button id="applyFilter">Apply</button>
            </div>
        </div>
    `;

    class WidgetDataSource extends HTMLElement {
		constructor() {
			super();
			/*this._shadowRoot = this.attachShadow({
                    mode: "open",
                    delegatesFocus: true
                });*/
            this.appendChild(tmpl.content.cloneNode(true));

            this._d3 = d3v5;
            this._d3Props = {};

            this._d3Props.updateTimeFormatter = this._d3.timeFormat("%I:%M%p")
            
            this._connected = false;
            this._props = {
                JSONUrl: "",
                RefreshTime: 300
            };

            this.$div = this.querySelector('div.datasource');
            this.$div.querySelector('#refresh').onclick = (e) => this.refresh();
            this.$div.querySelector('#applyFilter').onclick = (e) => this.updateFilteredData();
        }
        
        refresh() {
            if(this._props["JSONUrl"]) {
                this.updateData(this._props["JSONUrl"])
            }
        }

        startRefreshCountdown() {
            if(this._refreshTimeout) clearTimeout(this._refreshTimeout);

            this._refreshTimeout = setTimeout(() => this.refresh(), this._props["RefreshTime"] * 1000);

            const end = new Date().getTime() + (this._props["RefreshTime"] * 1000);

            if(this._countdownInterval) clearInterval(this._countdownInterval);

            this._countdownInterval = setInterval(() => {
                let now = new Date().getTime();
                let distance = end - now;

                let timestring = distance > 60000 ? Math.floor(distance / (1000 * 60)) + " Minutes" : Math.floor(distance / (1000)) + " Seconds";

                this.$div.querySelector(".refresh-timer .value").innerText = timestring; 
            }, 1000);
        }

        updateFilteredData() {
            this._selectedFilterItems = {};

            this._filters.select(".filter-select").each((d, i, node) => {
                this._selectedFilterItems[d.name] = $(node[i]).val() || [];
            });

            this._filteredData = {
                type: "FeatureCollection",
                features: []
            };

            for (var i = 0; i < this._rawData.features.length; i++) {
                var str = this._rawData.features[i].properties["description"];
                var res = str.split("<br />");

                let failedFilter = false;

                for (var j = 0; j < res.length && !failedFilter; j++) {
                    var item = res[j];
                    var index = item.indexOf(':');

                    var key = item.slice(0, index);
                    var value = item.slice(index + 1);

                    failedFilter = failedFilter || (this._selectedFilterItems.hasOwnProperty(key) ? this._selectedFilterItems[key].length > 0 && this._selectedFilterItems[key].indexOf(value) == -1 : false);
                }

                if(!failedFilter) this._filteredData.features.push(this._rawData.features[i]);
            }

            const event = new Event("onDataUpdate");
            this.dispatchEvent(event);
        }

        processFilters() {
            //TODO: Generic refactor
            //Sample Desc: "ALERT LEVEL: Advice <br />LOCATION: Seven Mile Road, Kowen Forest <br />COUNCIL AREA: ACT <br />STATUS: Under control <br />TYPE: Hazard Reduction <br />FIRE: Yes <br />SIZE: 0 ha <br />RESPONSIBLE AGENCY: ACT Parks And Conservation Service <br />UPDATED: 11 Sep 2020 17:19"
            //Ideas: ALERT LEVEL, STATUS, TYPE, RESPONSIBLE AGENCY

            let filterObject = {"ALERT LEVEL": [], "STATUS": [], "TYPE": [], "FIRE":[], "COUNCIL AREA": [], "RESPONSIBLE AGENCY": []};

            for (var i = 0; i < this._rawData.features.length; i++) {
                var str = this._rawData.features[i].properties["description"];
                var res = str.split("<br />");

                for (var j = 0; j < res.length; j++) {
                    var item = res[j];
                    var index = item.indexOf(':');

                    var key = item.slice(0, index);
                    var value = item.slice(index + 1);

                    if(filterObject.hasOwnProperty(key) && filterObject[key].indexOf(value) == -1) {
                        filterObject[key].push(value);
                    }
                }
            }

            const filterData = Object.keys(filterObject).map((key) => {
                return {name: key, values: filterObject[key]}
            });

            let shadowrootD3 = this._d3.select(this.$div);
            let filterBox = shadowrootD3.select('.filters');

            this._filters = filterBox.selectAll('.filter')
                .data(filterData)
                .join(
                    enter => {
                        let newFilter = enter.insert("div", ":first-child").attr("class", "filter");
                        newFilter.append("div").attr("class", "filter-label");
                        newFilter.append("select")
                            .attr("name", (d) => `${d.name.replace(" ", "-")}-filter-box`)
                            .attr("multiple", "multiple")
                            .attr("class", "filter-select");

                        return newFilter;
                    },
                    update => update,
                    exit => exit.remove()
                );

            
            let label = this._filters
                .select(".filter-label")
                .text(d => d.name.toLowerCase());

            let options = this._filters
                .select(".filter-select")
                .selectAll("option")
                .data(d => d.values)
                .join("option")
                .attr("value", d => d)
                .text(d => d);
            
            this._filters.select(".filter-select").each((d, i, node) => {
                $(node[i]).multiselect();

                if(this._selectedFilterItems) {
                    this._selectedFilterItems[d.name] = this._selectedFilterItems[d.name]?.filter((filterValue) => d.values.indexOf(filterValue) > -1) || [];
                    this._selectedFilterItems[d.name].forEach((filterValue) => $(node[i]).select(filterValue));
                }
            });
        }

        updateData(url) {
            fetch(url)
                .then(response => response.json())
                .then(data => {
                    this._rawData = data;

                    this.$div.querySelector(".data-age .value").innerText = this._d3Props.updateTimeFormatter(new Date());

                    this.startRefreshCountdown();

                    this.processFilters();

                    const event = new Event("onDataUpdate");
                    this.dispatchEvent(event);
                });
        }

        getRawData() {
            return this._rawData || {};
        }
        
        getFilteredData() {
            return this._filteredData || this.getRawData();
        }

        parseData(feedData) {
            return feedData.features.map((feedItem) => {
                let props = {...feedItem.properties};

                let descriptionString = props["description"];
                let descriptionItems = descriptionString.split("<br />");

                descriptionItems.forEach((item) => {
                    let splitPoint = item.indexOf(':'); 
                    var key = item.slice(0, splitPoint).trim();
                    var value = item.slice(splitPoint + 1).trim();

                    props[key] = value;
                });

                return props;
            });
        }

        getJSONData(type) {
            if(type == 'raw') {
                return JSON.stringify(this.getRawData());
            } else if (type == 'filtered') {
                return JSON.stringify(this.getFilteredData());
            } else if (type == 'parsedraw') {
                return JSON.stringify(this.parseData(this.getRawData()));
            }else if (type == 'parsedfiltered') {
                return JSON.stringify(this.parseData(this.getFilteredData()));
            }

            return "";
        }

        //Fired when the widget is added to the html DOM of the page
        connectedCallback(){
            this._connected = true;
            //allow for popover:
            this.parentNode.style.overflow = "visible";
        }

         //Fired when the widget is removed from the html DOM of the page (e.g. by hide)
        disconnectedCallback(){

        }
        
         //When the custom widget is updated, the Custom Widget SDK framework executes this function first
		onCustomWidgetBeforeUpdate(oChangedProperties) {
            let oldUrl = this._props['JSONUrl'];
            let newUrl = oChangedProperties['JSONUrl'];

            if(newUrl != oldUrl) {
                this.updateData(newUrl);
            }

            this._props = { ...this._props, ...oChangedProperties};
		}

        //When the custom widget is updated, the Custom Widget SDK framework executes this function after the update
		onCustomWidgetAfterUpdate(oChangedProperties) {
        }

        //When the custom widget is removed from the canvas or the analytic application is closed
        onCustomWidgetDestroy(){
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
			callback();
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

	loadScripts(["https://widgetdatasource.s3-ap-southeast-2.amazonaws.com/d3/d3v5.js","https://widgetdatasource.s3-ap-southeast-2.amazonaws.com/multiselect/multiselect.min.js"], () => customElements.define('com-sap-widget-datasource', WidgetDataSource));
})();
