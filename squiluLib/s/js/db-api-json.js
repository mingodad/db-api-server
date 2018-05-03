/*
 * Copyright (C) 2015 by Domingo Alvarez Duarte <mingodad@gmail.com>
 *
 * Licensed under GPLv3, see http://www.gnu.org/licenses/gpl.html.
 */

function createEditTableFieldSave()
{
	var view = getViewsCacheTop();
	var the_form = $id('fast-field-edit');
	var the_form_elements = the_form.elements;
	var the_select = the_form_elements.field_type;
	var caller_node = view.options.caller;
	if(caller_node.nodeName == "TD")
	{
		var tr = caller_node.parentNode;
	}
	else
	{
		//new field, new tr
		var table = getFirstParentWithTagName(caller_node, "TABLE");
		var tbody =  table.tBodies[0];
		var tr = tbody.rows[0].cloneNode(true);
		tbody.appendChild(tr);
	}
	var childNodes = tr.childNodes;
	setInnerText(childNodes[0], the_form_elements.field_name.value);
	setInnerText(childNodes[1], the_select.options[the_select.selectedIndex].text.match(/\S+/));
	setInnerText(childNodes[2], the_form_elements.field_notes.value);

	goBack();
}

function createEditTableField(event)
{
	var caller = getEventSource(event);
	
	var html = function(){/*
<button onclick='goBack()'>Cancel</button>
<br><br>
<form id='fast-field-edit'>
<table>
<tr><td>Field name</td><td><input type='text' name='field_name' onchange='checkValidIdentifierValue(this)'></td></tr>
<tr><td>Field type</td><td>
<select name='field_type'>
	<option>VARCHAR (One line text)</option>
	<option>INTEGER (Non fractional numbers)</option>
	<option>REFERENCE_ID (Integer type pointing to a table/field)</option>
	<option>BOOLEAN (On/Off values (1/0))</option>
	<option>FLOAT (Fast fractional numbers (not for monetary values))</option>
	<option>NUMERIC (Monetary values)</option>
	<option>DATE (Date only values)</option>
	<option>DATETIME (Date and time combined values)</option>
	<option>TEXT (Multiline text)</option>
	<option>BLOB (Binary values (images, documents, files))</option>
</select>
</td></tr>
<tr><td>Field notes</label></td><td><textarea name='field_notes'></textarea></td></tr>

<tr><td><input type='button' onclick='createEditTableFieldSave()' value='Save'></td><td></td></tr>
</table>
</form>
<br>
<button onclick='goBack()'>Cancel</button>
*/}
	html = html.toString();
	html = getTopBar("Create/Edit Table Field", true) + functionStringTemplateToString(html);
	//console.log(html);
	var view = addNewView(false, null, html);
	
	if(caller.nodeName == "TD")
	{
		//edit
		var tr = caller.parentNode;
		var the_form = $id('fast-field-edit');
		var the_form_elements = the_form.elements;
		var childNodes = tr.childNodes;
		the_form_elements.field_name.value = getInnerText(childNodes[0]);
		var field_type = getInnerText(childNodes[1]);
		var the_select = the_form_elements.field_type;
		var the_select_options = the_select.options;
		for(idx in the_select_options)
		{
			if(the_select_options[idx].text.indexOf(field_type) == 0)
			{
				the_select.selectedIndex = idx;
				break;
			}
		}
		the_form_elements.field_notes.value = getInnerText(childNodes[2]);
	}

	if(!view.options) view.options = {};
	view.options.caller = caller;
}

function deleteTableField(event)
{
	var tr = getFirstParentWithTagName(getEventSource(event), "TR");
	if(tr)
	{
		tr.parentNode.removeChild(tr);
	}
	disabledEventPropagation(event);
}

//first row is a template to be cloned
setStyle("#tbl-fast-create-table {display: none;} #tbl-fast-create-table tbody tr:first-child {display: none;}");

function showHideCreateNewTableFields(self)
{
	var the_table = $id("tbl-fast-create-table");
	if(self.value.length && the_table.style.display == "")
	{
		the_table.style.display = "table";
	}
	else if(!self.value.length && the_table.style.display.length)
	{
		the_table.style.display = "";
	}
}

function createEditTableSave()
{
	var curr_view = getViewsCacheTop();
	var json_table = {};
	json_table.table_name = $id("form-fast-create-table").elements.table_name.value;
	var fields = [];
	var rows = $id("tbody-table-fields").rows;
	for(var i=5, len = rows.length; i < len; ++i)
	{
		var childNodes = rows[i].childNodes;
		fields.push({"field_name": getInnerText(childNodes[0]), "field_type": getInnerText(childNodes[1]), "field_notes": getInnerText(childNodes[2])});
	}
	json_table.fields = fields;
	json_table = JSON.stringify(json_table);
	
	var the_url = api_base_uri + "_create_table/.json";
	//console.log(the_url);
	makeRequestByMethod(the_url,"POST", json_table, function(http_req, req_url){
			var data = JSON.parse(http_req.responseText);
			if(data.request_result == "OK")
			{
				goBack();
			}
			else alert(data.request_error);
		});
}

function createNewTable()
{
	var html = function(){/*
<button onclick='goBack()'>Cancel</button>
<br><br>
<form id="form-fast-create-table">
<label>Table name <input type='text' name='table_name' oninput='showHideCreateNewTableFields(this)' onchange='checkValidIdentifierValue(this)'></label>
<table class='tbl-list' id='tbl-fast-create-table'>
<thead>
	<tr><th>Field Name</th><th>Field Type</th><th>Notes</th><th>Op.</a></th></tr>
</thead>
<tbody id='tbody-table-fields'>
	<tr class='row-link' onclick='createEditTableField(event)'><td></td><td></td><td></td><td><a href='#' onclick='deleteTableField(event)'>Delete</a></td></tr>
	<tr><td>id</td><td>INTEGER PRIMARY KEY</td><td>Unique identifier for the record, autogenerated</td><td>None</td></tr>
	<tr><td>_version_</td><td>INTEGER</td><td>Each time the record is updated this is incremented</td><td>None</td></tr>
	<tr><td>_cdate_</td><td>DATETIME</td><td>Contains a date time when the record was created</td><td>None</td></tr>
	<tr><td>_mdate_</td><td>DATETIME</td><td>Contains the last date time the record was updated</td><td>None</td></tr>
	<tr class='row-link' onclick='createEditTableField(event)'><td>name</td><td>VARCHAR</td><td>Store a friendly name/description</td><td><a href='#' onclick='deleteTableField(event)'>Delete</a></td></tr>
	<tr class='row-link' onclick='createEditTableField(event)'><td>notes</td><td>TEXT</td><td>Store anottations</td><td><a href='#' onclick='deleteTableField(event)'>Delete</a></td></tr>
</tbody>
<tfoot>
	<tr><td colspan='3'>&nbsp;</td><td><br><a href='#' onclick='createEditTableField(event)'>New</a></td></tr>
</tfoot>
</table>
<input type='button' value='Create' onclick='createEditTableSave()'>
</form>
<br>
<button onclick='goBack()'>Cancel</button>
*/}
	html = html.toString();
	html = getTopBar("Create new Table", true) + functionStringTemplateToString(html);
	//console.log(html);
	addNewView(false, null, html);
	var the_form = $id('form-fast-create-table');
	the_form.elements.table_name.focus();
}

function doTableSearchProxy(serachInput, tbl_id)
{
	return doTableSearch(serachInput, tbl_id);
}

function loadTheApi(the_api)
{
	var view = getViewsCacheTop();
	the_api_base_uri = the_api;
	makeGetRequest(the_api_base_uri + ".json", function(http_req, req_url){
			//alert(this.responseText);
			var data = JSON.parse(http_req.responseText);
			var rows = data.rows;
			var all_tables_view = getTopBar("API Tables List", true) + 
				"<label><input type='checkbox' onclick='showMore(this.checked)'> Show more</label> <button onclick='createNewTable()'>Create new Table</button><br><br>Search for <input type='text' id='searchTerm' class='search_box' onkeyup='doTableSearchProxy(this, \"tbl-list\")' /><table  class='tbl-list' id='tbl-list'>";
			for(var i=0, len = rows.length; i < len; ++i)
			{
				var rec = rows[i];
				var table_name = rec["name"];
				all_tables_view += "<tr" + (table_name.charAt(0) == '_' ? " class='show-more'" : "") +
					"><td><a href='#' onclick='return loadLinkList(\"" + 
					table_name + "\")'>" + table_name + "</a></td></tr>";
			}
			all_tables_view += "</table>";
			addNewView(req_url, null, all_tables_view);
	});
	return false;
}

if(typeof customLoadTheApi !== "undefined") customLoadTheApi();
else
{
	if(the_api_base_uri) loadTheApi(the_api_base_uri);
	else
	{
		makeGetRequest(api_base_uri + ".json", function(http_req, req_url){
				//alert(this.responseText);
				var data = JSON.parse(http_req.responseText);
				var api_list = data.apis;
		
				var re = new RegExp(api_base_uri + "([^/]+)");

				var all_apis_view = getTopBar("API's List", true) + 
					"<table class='tbl-list'>";
				for(var i=0, len = api_list.length; i < len; ++i)
				{
					var the_api = api_list[i];
					var api_name = the_api.match(re);
					if(api_name && (api_name.length > 1)) api_name = api_name[1];
					else continue;
					all_apis_view += "<tr><td><a href='#' onclick='return loadTheApi(\"" + 
						the_api + "\")'>" + api_name + "</a></td></tr>";
				}
				all_apis_view += "</table>";
				addNewView(req_url, null, all_apis_view);
				re = null;	
			});
	}
}

//onload = function(){};
