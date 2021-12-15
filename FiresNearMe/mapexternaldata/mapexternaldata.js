(function () {
    let initCalled;



    const squizscript = document.createElement("script");
    const googleMapsLoader = document.createElement("script");
    const gmymap = "Custom Google Map";
    // googleMapsLoader.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBG1a6OCFGy10XfHPj4V8FijLlmcXmAYvo&language=en`;
    googleMapsLoader.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyAx12ZkQ40knlFbAtM8jwJoGqbJWuDRvuI&language=en`;
    googleMapsLoader.async = true;
    googleMapsLoader.defer = true;
    document.head.appendChild(googleMapsLoader);
    googleMapsLoader.onload = () =>
        customElements.define(
            "com-demo-map-external-data",
            class MapExternalData extends HTMLElement {
                constructor() {
                    super();

                    if (!window._mymap) {
                        window._mymap = gmymap;
                    }

                    let shadowRoot = this.attachShadow({ mode: "open" });
                    var style = document.createElement("style");
                    style.textContent =
                        ":host { display: block } #map { width: 100%; height: 100%; position: absolute;}";
                    shadowRoot.appendChild(style);

                    // Create the DIV
                    var mapdiv = document.createElement("div");
                    mapdiv.setAttribute("id", "map");
                    shadowRoot.appendChild(mapdiv);


                    this.infoWindowTemplate = document.createElement('template');

                    shadowRoot.appendChild(this.infoWindowTemplate);

                    this.infoWindowTemplate.innerHTML = "<div class='map-info-window'></div>";

                    this._props = {};
                }

                connectedCallback() {
                    console.log("Custom square element added to page.");
                    this._drawmap();
                }

                renderMap() {

                }

                setData(data) {
                    let GeoJSON = JSON.parse(data || "null");

                    if(this._mapFeatures) {
                        this._mapFeatures.forEach((feature) => this._map.data.remove(feature));
                    }

                    this._mapFeatures = this._map.data.addGeoJson(GeoJSON, { idPropertyName: "id" });
                }

                _drawmap() {
                    var mapDiv = this.shadowRoot.querySelector("#map");
                    var latlng = new google.maps.LatLng(-33.450301, 150.060243);
                    var max_bounds = [
                        // NSW Boundaries
                        [-37.51, 141.0],
                        [-28.16, 153.64],
                    ];

                    var options = {
                        center: latlng,
                        latLngBounds: max_bounds,
                        strictBounds: false,
                        zoom: 6,
                        max_zoom: 8,
                        baselayer: "google",
                        show_controls: ["zoom", "layers"],
                        show_centre_marker: true,
                        control_position: {
                            zoom: "topleft",
                            layers: "topright",
                        },
                    };

                    // Creating the map
                    this._map = new google.maps.Map(mapDiv, options);
                    this._infoWindow = new google.maps.InfoWindow({
                        content: ""
                    });

                    const urlicon = "https://www.rfs.nsw.gov.au/_designs/geojson/fires-near-me/images/";
                    this._map.data.setStyle(function (feature) {
                        switch (feature.getProperty("category")) {
                            case "Advice":
                                return {
                                    icon: urlicon + "advice.png",
                                };
                                break;
                            case "Watch and Act":
                                return {
                                    icon: urlicon + "watch_and_act.png",
                                };
                                break;
                            case "Emergency Warning":
                                return {
                                    icon: urlicon + "emergency_warning.png",
                                };
                                break;
                            default:
                                return {
                                    icon: urlicon + "not-applicable.png",
                                };
                                break;
                        }
                    });

                    let that = this;
                    that._map.data.addListener('click', function (event) {
                        that.buildInfoWindow(event.feature);

                        var anchor = new google.maps.MVCObject();
                        anchor.set("position", event.latLng);
                        that._infoWindow.open(that._map, anchor);

                        that._activeMarkerGUID = event.feature.getProperty("guid");

                        //that.dispatchEvent(new Event("onMarkerSelect"));
                    });
                }

                buildInfoWindow(feature) {
                    let parsedDescription= this.parseFeatureDataDescription(feature.getProperty("description"));

                    let infoWindowContent = this.infoWindowTemplate.content.cloneNode(true);
                    let infoWindowRoot = infoWindowContent.querySelector('div.map-info-window');

                    let style = infoWindowRoot.appendChild(document.createElement('style'));
                    style.innerHTML = `
                        .header {
                            padding: 12px;
                            text-align: center;
                            font-weight: bold;
                        }
                        
                        .content {
                            margin: 6px;
                        }
                        
                        .content div {
                            padding: 3px 0px;
                        }

                        .content .name {
                            font-weight: bold;
                        }

                        .content .value {
                            padding-left: 9px;
                        }
                    `;

                    let infoWindowHeader = infoWindowRoot.appendChild(document.createElement('div'));
                    infoWindowHeader.setAttribute('class', 'header');
                    infoWindowHeader.innerText = feature.getProperty("title");

                    let infoWindowCotentRows = infoWindowRoot.appendChild(document.createElement('div'));
                    infoWindowCotentRows.setAttribute('class', 'content');

                    Object.keys(parsedDescription).forEach((propName) => {
                        let contentRow = infoWindowCotentRows.appendChild(document.createElement('div'));

                        let propNameSpan = contentRow.appendChild(document.createElement('span'))
                        propNameSpan.setAttribute('class', 'name');
                        propNameSpan.innerText = propName;

                        let propValueSpan = contentRow.appendChild(document.createElement('span'))
                        propValueSpan.setAttribute('class', 'value');
                        propValueSpan.innerText = parsedDescription[propName];
                    });
                    
                    this._infoWindow.setContent(infoWindowRoot);
                }

                getActiveMarker() {
                    return this._activeMarkerGUID;
                }

                highlightFeatures(features) {
                    let featuresJSON = JSON.parse(features);


                    this._map.data.revertStyle();

                    if(Array.isArray(featuresJSON) && featuresJSON.length) {
                        let notInSelectionFeatures = this._mapFeatures.filter((mapFeature) => {
                            let props = {};
                            let descriptionString = mapFeature.getProperty("description");
                            let descriptionItems = descriptionString.split("<br />");

                            descriptionItems.forEach((item) => {
                                let splitPoint = item.indexOf(':'); 
                                var key = item.slice(0, splitPoint).trim();
                                var value = item.slice(splitPoint + 1).trim();

                                props[key] = value;
                            });

                            let isInSelection = featuresJSON.find((highlightFeature) => {
                                let doesNotMatch = false;
                                
                                Object.keys(highlightFeature).forEach((key) => {
                                    doesNotMatch = doesNotMatch || highlightFeature[key] != props[key];
                                });
                                return !doesNotMatch;
                            });

                            return !isInSelection;
                        });

                        notInSelectionFeatures.forEach((feature) => {
                            this._map.data.overrideStyle(feature, {
                                visible: false
                            });
                        });

                    } else {
                        let matchingFeature = this._mapFeatures.find((feature) => {
                            return featuresJSON["guid"] == feature.getProperty("guid");
                        });
    
                        if(matchingFeature) {
                            
                            this.buildInfoWindow(matchingFeature);

                            var anchor = new google.maps.MVCObject();
                            let geometry = matchingFeature.getGeometry();

                            if(geometry.getType() == "Point") {
                                anchor.set("position", geometry.get());
                            } else if(geometry.getType() == "GeometryCollection") {
                                anchor.set("position", geometry.getAt(0).get());
                            }

                            this._infoWindow.open(this._map, anchor);

                            this._map.setZoom(10);
                            this._map.panTo(anchor.position);
                        }
                    }
                }

                parseFeatureDataDescription(descriptionString) {
                    let props = {};
    
                    let descriptionItems = descriptionString.split("<br />");
    
                    descriptionItems.forEach((item) => {
                        let splitPoint = item.indexOf(':'); 
                        var key = item.slice(0, splitPoint).trim();
                        var value = item.slice(splitPoint + 1).trim();
    
                        props[key] = value;
                    });
    
                    return props;
                }

                onCustomWidgetBeforeUpdate(changedProperties) {
                    this._props = { ...this._props, ...changedProperties };
                }

                onCustomWidgetAfterUpdate(changedProperties) {
                }
            }
        );
})();
