(function()  {
	let template = document.createElement("template");
	template.innerHTML = `
		<form id="form">
			<fieldset>
				<legend>Datasource</legend>
				<table>
					<tr>
						<td>URL</td>
						<td><input id="builder_url" type="text" size="10" maxlength="100"></td>
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

	class WidgetDataSourceBuilderPanel extends HTMLElement {
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
							JSONUrl: this.JSONUrl
						}
					}
			}));
		}

		set JSONUrl(newUrl) {
			this._shadowRoot.getElementById("builder_url").value = newUrl;
		}

		get JSONUrl() {
			return this._shadowRoot.getElementById("builder_url").value;
		}
	}

	customElements.define("com-sap-widget-datasource-builder", WidgetDataSourceBuilderPanel);
})();