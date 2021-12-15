(function()  {
	let template = document.createElement("template");
	template.innerHTML = `
		<form id="form">
			<fieldset>
				<legend>Properties</legend>
				<table>
					<tr>
						<td>Label</td>
						<td><input id="label" type="text" size="20" maxlength="100"></td>
					</tr>
					<tr>
						<td>Header Font</td>
						<td><input id="bps_headerfont" type="text" size="10" maxlength="20"></td>
					</tr>
					<tr>
						<td>Header Size</td>
						<td><input id="bps_headersize" type="text" size="10" maxlength="10"></td>
					</tr>
					<tr>
						<td>Header Color</td>
						<td><input id="bps_headercolor" type="text" size="10" maxlength="10"></td>
					</tr>
					<tr>
						<td>Measure Font</td>
						<td><input id="bps_measurefont" type="text" size="10" maxlength="20"></td>
					</tr>
					<tr>
						<td>Measure Size</td>
						<td><input id="bps_measuresize" type="text" size="10" maxlength="10"></td>
					</tr>
					<tr>
						<td>Measure Color</td>
						<td><input id="bps_measurecolor" type="text" size="10" maxlength="10"></td>
					</tr>
				</table>
				<input type="submit" style="display:none;">
			</fieldset>
		</form>
		<style>
		:host {
			display: block;
			padding: 1em 1em 1em 1em;
		}
		</style>
	`;

	class MeasureTileBuilder extends HTMLElement {
		constructor() {
			super();
			this._shadowRoot = this.attachShadow({mode: "open"});
			this._shadowRoot.appendChild(template.content.cloneNode(true));
			this._shadowRoot.getElementById("form").addEventListener("submit", this._submit.bind(this));
		}

		_submit(e) {
			e.preventDefault();
			this.dispatchEvent(new CustomEvent("propertiesChanged", {
					detail: {
						properties: {
							label: this.label,
							headerfont: this.headerfont,
							headersize: this.headersize,
							headercolor: this.headercolor,
							measurefont: this.measurefont,
							measuresize: this.measuresize,
							measurecolor: this.measurecolor,
						}
					}
			}));
		}

		// set color(newColor) {
		// 	this._shadowRoot.getElementById("bps_color").value = newColor;
		// }

		set label(newLabel) {
			this._shadowRoot.getElementById("label").value = newLabel;
		}

		set headerfont(newHFont) {
			this._shadowRoot.getElementById("bps_headerfont").value = newHFont;
		}

		set headersize(newHSize) {
			this._shadowRoot.getElementById("bps_headersize").value = newHSize;
		}

		set headercolor(newHColor) {
			this._shadowRoot.getElementById("bps_headercolor").value = newHColor;
		}

		set measurefont(newMFont) {
			this._shadowRoot.getElementById("bps_measurefont").value = newMFont;
		}

		set measuresize(newMSize) {
			this._shadowRoot.getElementById("bps_measuresize").value = newMSize;
		}

		set measurecolor(newMColor) {
			this._shadowRoot.getElementById("bps_measurecolor").value = newMColor;
		}

		get label() {
			return this._shadowRoot.getElementById("label").value;
		}

		get headerfont() {
			return this._shadowRoot.getElementById("bps_headerfont").value;
		}

		get headersize() {
			return this._shadowRoot.getElementById("bps_headersize").value;
		}

		get headercolor() {
			return this._shadowRoot.getElementById("bps_headercolor").value;
		}

		get measurefont() {
			return this._shadowRoot.getElementById("bps_measurefont").value;
		}

		get measuresize() {
			return this._shadowRoot.getElementById("bps_measuresize").value;
		}

		get measurecolor() {
			return this._shadowRoot.getElementById("bps_measurecolor").value;
		}

		// get color() {
		// 	return this._shadowRoot.getElementById("bps_color").value;
		// }
	}

	customElements.define("com-demo-measuretile-builder", MeasureTileBuilder);
})();
