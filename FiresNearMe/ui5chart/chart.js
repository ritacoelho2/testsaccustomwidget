(function () {
    let tmpl = document.createElement('template');
    tmpl.innerHTML = `
        <script ui5xml type="sapui5/xmlview">
            <mvc:View
                width="100%"
                height="100%"
                xmlns:layout="sap.ui.layout"
                xmlns:mvc="sap.ui.core.mvc"
                xmlns:viz="sap.viz.ui5.controls"
                xmlns:viz.data="sap.viz.ui5.data"
                xmlns:viz.feeds="sap.viz.ui5.controls.common.feeds"
                xmlns:chart="sap.suite.ui.commons"
                xmlns="sap.m">
                <viz:VizFrame id="vizAnchor" uiConfig="{applicationSet:'fiori'}" height="100%" width="100%"></viz:VizFrame>
            </mvc:View>
        </script>
        <style>
            .ui5-chart-anchor {
                width: 100%;
                height: 100%;
            }
        </style>
        <div class="ui5-chart-anchor"></div>
    `;

    customElements.define('com-demo-ui5-chart', class UI5Chart extends HTMLElement {
        constructor() {
            super();
            //this._shadowRoot = this.attachShadow({ mode: "open" });
            this.appendChild(tmpl.content.cloneNode(true));
            this.$div = this.querySelector('div.ui5-chart-anchor');

            let that = this;

            this.ChartController = sap.ui.core.mvc.Controller.extend("ChartController", {
                onInit: function () {
                	debugger;
                    that.oChart = this.getView().byId("vizAnchor");
                    that.oChart.attachSelectData((e) => {
                        let currentSelection = e.oSource.vizSelection();
                        that.processSelection(currentSelection);
                    });

                    that.oChart.attachDeselectData((e) => {
                        that.processSelection([]);
                    });
                }
            });

            this.oView = sap.ui.xmlview({
                viewContent: this.querySelector('script[ui5xml]').innerHTML,
                controller: new this.ChartController()
            });

            this.oView.placeAt(this.$div);
        }

        //Fired when the widget is added to the html DOM of the page
        connectedCallback() {
        }

        //Fired when the widget is removed from the html DOM of the page (e.g. by hide)
        disconnectedCallback() {
        }

        getSelection() {
            return JSON.stringify(this.currentSelection);
        }

        processSelection(selectionArray) {

            if (!selectionArray || selectionArray?.length == 0) {
                this.currentSelection = [];
            } else if (this.type == "Incidents Per Alert Level") {
                this.currentSelection = selectionArray.map((selection) => {
                    let measure = Object.keys(selection.data).filter((e) => {
                        return ["_context_row_number", "Alert Level"].indexOf(e) == -1;
                    });

                    return {
                        "ALERT LEVEL": selection.data['Alert Level'],
                        "STATUS": measure[0]
                    };
                });
            } else if (this.type == "Incidents Per Responsible Agency") {
                this.currentSelection = selectionArray.map((selection) => {
                    return {
                        "RESPONSIBLE AGENCY": selection.data['Agency']
                    }
                });
            } else if (this.type == "Incidents Per Type") {
                this.currentSelection = selectionArray.map((selection) => {
                    return {
                        "TYPE": selection.data['Type']
                    }
                });
            }

            const event = new Event("onSelect");
            this.dispatchEvent(event);
        }

        updateChartConfig(config) {
            this.type = config.type;
            let props = {};

            let title = this.type;

            if (this.type == "Incidents Per Alert Level") {
                props = {
                    dimensions: [{
                        name: "Alert Level",
                        value: "{ALERT LEVEL}"
                    }],
                    measures: [{
                        name: "Under control",
                        value: "{Under control}"
                    }, {
                        name: "Being controlled",
                        value: "{Being controlled}"
                    }, {
                        name: "Out of control",
                        value: "{Out of control}"
                    }],
                    type: 'stacked_bar',
                    vizProps: {
                        plotArea: {
                            colorPalette: d3.scale.category20().range(),
                            dataLabel: {
                                showTotal: true
                            }
                        },
                        tooltip: {
                            visible: true
                        },
                        title: {
                            text: title
                        }
                    },
                    feeds: [{
                        'uid': "valueAxis",
                        'type': "Measure",
                        'values': ["Under control"]
                    }, {
                        'uid': "valueAxis",
                        'type': "Measure",
                        'values': ["Being controlled"]
                    }, {
                        'uid': "valueAxis",
                        'type': "Measure",
                        'values': ["Out of control"]
                    }, {
                        'uid': "categoryAxis",
                        'type': "Dimension",
                        'values': ["Alert Level"]
                    }]
                }
            } else if (this.type == "Incidents Per Responsible Agency") {
                props = {
                    dimensions: [{
                        name: "Agency",
                        value: "{RESPONSIBLE AGENCY}"
                    }],
                    measures: [{
                        name: "Incidents",
                        value: "{RESPONSIBLE AGENCY_Sum}"
                    }],
                    type: 'donut',
                    vizProps: {
                        plotArea: {
                            colorPalette: d3.scale.category20().range(),
                            dataLabel: {
                                visible: true,
                                showTotal: true
                            }
                        },
                        tooltip: {
                            visible: true
                        },
                        title: {
                            text: title
                        }
                    },
                    feeds: [{
                        'uid': "size",
                        'type': "Measure",
                        'values': ["Incidents"]
                    }, {
                        'uid': "color",
                        'type': "Dimension",
                        'values': ["Agency"]
                    }]
                }
            } else if (this.type == "Incidents Per Type") {
                props = {
                    dimensions: [{
                        name: "Type",
                        value: "{TYPE}"
                    }],
                    measures: [{
                        name: "Incidents",
                        value: "{TYPE_Sum}"
                    }],
                    type: 'bar',
                    vizProps: {
                        plotArea: {
                            colorPalette: d3.scale.category20().range(),
                            dataLabel: {
                                showTotal: true
                            }
                        },
                        tooltip: {
                            visible: true
                        },
                        title: {
                            text: title
                        },
                        categoryAxis: {
                            title: {
                                visible: false
                            },
                            label: {
                                linesOfWrap: 2,
                                angle: 45,
                                rotation: "auto"
                            }
                        }
                    },
                    feeds: [{
                        'uid': "valueAxis",
                        'type': "Measure",
                        'values': ["Incidents"]
                    }, {
                        'uid': "categoryAxis",
                        'type': "Dimension",
                        'values': ["Type"]
                    }]
                }
            }

            var oDataset = new sap.viz.ui5.data.FlattenedDataset({
                dimensions: props.dimensions,
                measures: props.measures,
                data: {
                    path: "/data"
                }
            });

            this.oChart.setVizProperties(props.vizProps);
            this.oChart.setVizType(props.type);
            this.oChart.setDataset(oDataset);

            this.oChart.removeAllFeeds();
            props.feeds.forEach((feed) => {
                var feedValueAxis = new sap.viz.ui5.controls.common.feeds.FeedItem(feed);
                this.oChart.addFeed(feedValueAxis);
            })
        }

        setData(data, details) {
            let JSONdata = JSON.parse(data || "null");
            let JSONdetails = JSON.parse(details || "null");

            let dimensions, measures;

            this.updateChartConfig(JSONdetails);

            if (JSONdetails.type == "Incidents Per Alert Level") {
                dimensions = [{
                    name: "ALERT LEVEL"
                }];

                measures = [{
                    name: "STATUS",
                    type: "Count"
                }];
            } else if (JSONdetails.type == "Incidents Per Responsible Agency") {
                dimensions = [{
                    name: "RESPONSIBLE AGENCY"
                }];

                measures = [{
                    name: "RESPONSIBLE AGENCY",
                    type: "Sum"
                }];
            } else if (JSONdetails.type == "Incidents Per Type") {
                dimensions = [{
                    name: "TYPE"
                }];

                measures = [{
                    name: "TYPE",
                    type: "Sum"
                }];
            }

            let chartData = [];

            JSONdata.forEach((item) => {
                let chartItem = chartData.find(existingObject => {
                    let mismatch = false;

                    dimensions.forEach((dimension) => {
                        mismatch = mismatch || existingObject[dimension.name] != item[dimension.name];
                    });

                    return !mismatch;
                });

                if (!chartItem) {
                    chartItem = {};
                    dimensions.forEach((dimension) => {
                        chartItem[dimension.name] = item[dimension.name];
                    })

                    chartData.push(chartItem);
                }

                measures.forEach((measure) => {
                    if (measure.type == "Count") {
                        let itemValueForMeasure = item[measure.name];
                        chartItem[itemValueForMeasure] = (chartItem[itemValueForMeasure] || 0) + 1;
                    } else if (measure.type == "Sum") {
                        chartItem[measure.name + "_Sum"] = (chartItem[measure.name + "_Sum"] || 0) + 1;
                    }
                })

            });

            let JSONModel = new sap.ui.model.json.JSONModel({
                data: chartData
            });
            this.oChart.setModel(JSONModel);
        }

        //When the custom widget is updated, the Custom Widget SDK framework executes this function first
        onCustomWidgetBeforeUpdate(oChangedProperties) {

        }

        //When the custom widget is updated, the Custom Widget SDK framework executes this function after the update
        onCustomWidgetAfterUpdate(oChangedProperties) {

        }
    });
})();
