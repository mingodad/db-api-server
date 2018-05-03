/*
 Gui builder: Application to test JsLayoutManager 
 (https://github.com/mingodad/slm.js)
 Copyright (c) 2014, Domingo Alvarez Duarte - mingodad[at]gmail[dot]com
 
 Released under the GNU LESSER GENERAL PUBLIC LICENSE  Version 3
 
 */

function getDynContentElement()
{
	if(ide_globals.tab_details_selected == "Meta Data")
	{
		return $id("tab-table-view-meta-data");
	}
	return $id("tab-table-view-data");
}

function getScrollContentElement()
{
	return getDynContentElement();
}

var ide_globals = {
	"tab_details_selected": "Data",
	"timming_start": getTimming()
};

var old_makeRequestByMethod = makeRequestByMethod;

var makeRequestByMethod = function(url, method, data, readyfn, encode_type, onRequestEnd_cb) {
	var statusbar = $id("statusbar");
	setInnerText(statusbar, "Loading: " + url);
	ide_globals.timming_start = getTimming();
	setWaitCursor();
	var myreadyfn = function(sender, url)
	{
		var timming_now = getTimming();
		var time_spent_network = timming_now  - ide_globals.timming_start;
		readyfn(sender, url);
		var time_spent_render = getTimming() - timming_now;
		setInnerText(statusbar, getInnerText(statusbar) + " -> Time spent: " + time_spent_network + ":" + time_spent_render);
	};
	var myonRequestEnd_cb = function()
	{
		setDefaultCursor();
		if(onRequestEnd_cb) onRequestEnd_cb();
	};
	old_makeRequestByMethod(url, method, data, myreadyfn, encode_type, myonRequestEnd_cb);
}

function tabsDetailsSelectTab(tabId) {
	var tabs = document.getElementById('tabs-details');
	JsLayoutManager.tabsSelect(tabs, tabId);
}

function manageMenuClick(event) {
	var target = JsLayoutManager.getEventSource(event);
	//console.log(target);
	var action = target.getAttribute("data-action");
	if (action) {
		var tabs = document.getElementById('tabs-projects');
		var project_name, theTab = document.getElementById(currentProjectTabId);
		switch (action) {
		case "project-new":
			project_name = prompt("Please enter project name", "");
			if (project_name) {
				if (tabs) {
					var newTab = JsLayoutManager.tabsAddTab(tabs, project_name);
					if (newTab) {
						newTab.onclick = showPropertiesFor;
					}
				}
			}
			break;
		case "project-close":
			if (confirm("Are you sure to close the current project ?") === true) {
				if (theTab) {
					JsLayoutManager.tabsRemoveTab(theTab);
				}
			}
			break;
		case "project-save":
			if (theTab) {
				project_name = JsLayoutManager.tabsGetTabTitle(theTab);
				doSaveLoadHtmlContent(true, currentProjectTabId, project_name);
			}
			break;
		case "project-open":
			if (theTab) {
				project_name = JsLayoutManager.tabsGetTabTitle(theTab);
				doSaveLoadHtmlContent(false, currentProjectTabId, project_name);
			}
			break;
		}
	}
	//JsLayoutManager.menuClose(menu);
}

function clearTableViewData() {
	var the_table = $id("table-view-raw-data");
	the_table.innerHTML = "";
}

function showTableViewData(http_req, req_url) {
	//alert(this.responseText);
	var data = JSON.parse(http_req.responseText);
	//if (data.request_result == "OK") {
	var the_table = $id("table-view-raw-data");
	var data_rows = data.rows;
	var data_columns = data.columns;
	var col_count = data_columns.length;
	var table_body = "<thead><tr>";
	for (var i = 0; i < col_count; ++i) {
		table_body += "<th>" + data_columns[i] + "</th>";
	}
	table_body += "</tr></thead><tbody>";
	for (var i = 0, len = data_rows.length; i < len; ++i) {
		var row = data_rows[i];
		table_body += "<tr>";
		for (var j = 0; j < col_count; ++j) {
			table_body += "<td>" + row[j] + "</td>";
		}
		table_body += "</tr>";
	}
	table_body += "</tbody>";
	the_table.innerHTML = table_body;
	//} else alert(data.request_error);
}

function showDataFor(the_id) {
	if (the_id) {
		var max_rows = getMaxRowsValue();
		if(ide_globals.tab_details_selected == "Data")
		{
			clearViewsCache();
			var options = {"query_string": "?max_rows=" + max_rows};
			loadLinkList(the_id.table_name, options);
		} else if(ide_globals.tab_details_selected == "Raw Data"){
			makeGetRequest(the_api_base_uri + "__get_table_or_view_data?id=" + the_id.table_id + "&max_rows=" + max_rows, 
			function (http_req, req_url) {
				showTableViewData(http_req, req_url);
			});
		}
	}
}

function showFieldsFor(the_id) {}

function showMetaDataFor(the_id) {
	if (the_id) {
		var path = the_api_base_uri + "__tables_metadata_info?table=" + the_id.table_name;
		doViewEditRecordByUrl(path, "__tables_metadata");
	}
}
	
function showIndexesFor(the_id) {
	if (the_id) {
		var ta = $id("ta-table-indexes");
		makeGetRequest(the_api_base_uri + "/__get_table_view_indexes?table=" + encodeURIComponent(the_id.table_name), function (http_req, req_url) {
			ta.value = http_req.responseText;
		});
	}
}

function showTriggersFor(the_id) {
	if (the_id) {
		var ta = $id("ta-table-triggers");
		makeGetRequest(the_api_base_uri + "/__get_table_view_triggers?table=" + encodeURIComponent(the_id.table_name), function (http_req, req_url) {
			ta.value = http_req.responseText;
		});
	}
}

function showSchemaFor(the_id) {
	if (the_id) {
		var ta = $id("ta-table-schema");
		makeGetRequest(the_api_base_uri + "__get_table_view_schema?table=" + encodeURIComponent(the_id.table_name), function (http_req, req_url) {
			ta.value = http_req.responseText;
		});
	}
}

function getMaxRowsValue()
{
	var max_rows = $id("max-rows");
	return max_rows.value;
}

function getSelectGenSqlValue()
{
	var sgs = $id("select-gen-sql");
	return sgs.options[sgs.selectedIndex].value;
}

function showReferencesInSchemaFor(the_id) {
	var option = getSelectGenSqlValue();
	var sql_code = $id("sql-code");
	var str = sql_code.value;
	if (str) {
		var url;
		switch (option) {
		case "references":
			url = "__get_references_in_schema";
			break;
		case "search all":
			url = "__search_in_all_tables";
			break;
		}
		if (url) {
			var limit = getMaxRowsValue();
			var ta = $id("ta-references");
			makeGetRequest(the_api_base_uri + url + "?str=" + encodeURIComponent(str) + "&limit=" + limit, function (http_req, req_url) {
				ta.value = http_req.responseText;
			});
		}
	}
}

function doUpdateMetadata()
{
	var ta = $id("ta-references");
	makeGetRequest(the_api_base_uri + "__update_metadata", function (http_req, req_url) {
		ta.value = http_req.responseText;
		loadTablesViews();
	});
}

function doBackup()
{
	var ta = $id("ta-references");
	makeGetRequest(the_api_base_uri + "__create_a_backup", function (http_req, req_url) {
		ta.value = http_req.responseText;
	});
}

function doExecuteSql() {
	setWaitCursor();
	var query_type = getSelectGenSqlValue();
	var sql_code = $id("sql-code");
	var sql = sql_code.value;
	if (sql) {
		var data = "query_type=" + encodeURIComponent(query_type) + "&max_rows=" + encodeURIComponent(getMaxRowsValue()) + "&sql=" + encodeURIComponent(sql);
		makeRequestByMethod(the_api_base_uri + "__exec_sql", "POST", data, function (http_req, req_url) {
			setDefaultCursor();
			if(query_type == "select" || query_type == "sql_macros")
			{
				clearTableViewData();
				tabsDetailsSelectTab("Raw Data");
				showTableViewData(http_req, req_url);
			}
			else
			{
				if(query_type.indexOf("sql_macros_") == 0)
				{
					sql_code.value = http_req.responseText;
				}
				else if(query_type.indexOf("squilu_") == 0)
				{
					sql_code.value = http_req.responseText;
				}
				else
				{
					tabsDetailsSelectTab("References");
					var ta = $id("ta-references");
					ta.value = http_req.responseText;
				}
				//loadTablesViews();
			}
		}, "application/x-www-form-urlencoded");
	}
}

function getCurrentSelectedTableView() {
	var curr_selected = ide_globals.table_views_selected;
	if (curr_selected) {
		return {
			"table_id": getInnerText(curr_selected.cells[0]),
			"table_name": getInnerText(curr_selected.cells[1]),
			"is_view": getInnerText(curr_selected.cells[2]) == "1"
		};
	}
	return null;
}

function doGenerateSql() {
	var curr_selected = getCurrentSelectedTableView();
	if (curr_selected) {
		var table_id = curr_selected.table_id;
		var table_name = curr_selected.table_name;
		var is_view = curr_selected.is_view;
		var sql = "";
		var max_rows = getMaxRowsValue();
		var sql_code = $id("sql-code");
		var option = getSelectGenSqlValue();
		
		
		switch (option) {
		case "select":
		case "insert":
		case "update":
		case "delete":
		case "schema update":
		case "schema update norefs":
		case "sqlite_master update":
		case "drop table":
		case "dump table":
		case "create index":
		case "create trigger":
			var query_type = option;
			makeGetRequest(the_api_base_uri + "__create_sql_querie?table=" + encodeURIComponent(table_name) + 
							"&query_type=" + encodeURIComponent(query_type) + "&max_rows=" + max_rows, 
				function (http_req, req_url) {
					sql_code.value = http_req.responseText;
				});
			break;
		case "references":
		case "search all":
			tabsDetailsSelectTab("References");
			break;
		}
	}
}


function onTableViewClicked(self, the_id, isDblClick) {
	var curr_selected = ide_globals.table_views_selected;
	if (curr_selected) {
		JsLayoutManager.removeClass(curr_selected, "row-selected");
	}
	JsLayoutManager.addClass(self, "row-selected");
	ide_globals.table_views_selected = self;
	var isTabDataSelected = ide_globals.tab_details_selected == "Data";
	if (isDblClick && !isTabDataSelected) {
		tabsDetailsSelectTab("Data");
	}
	showDetails(ide_globals.tab_details_selected);
	showDataFor(getCurrentSelectedTableView());
}

function onTableViewClick(self, event, isDblClick) {
	var td = tableClick(self, event);
	if (td) {
		var tr = td.parentNode;
		var the_id = getInnerText(tr.firstChild);
		onTableViewClicked(tr, the_id, isDblClick);
	}
}

function hideShowSystemTablesFromList(to_hide)
{
	var table_views = $id("main-tables-views");
	var rows = table_views.tBodies[0].rows;
	for (var i = 0, len = rows.length; i < len; ++i) {
		var row = rows[i];
		var tbl_name = row.cells[1].innerText;
		if(tbl_name.indexOf("__") == 0)
		{
			row.style.display = to_hide ? "none" : "";
		}
	}
}

function hideSystemTablesFromList(cbx)
{
	hideShowSystemTablesFromList(cbx.checked);
}

function loadTablesViews() {
	makeGetRequest(the_api_base_uri + "__get_tables_and_views", function (http_req, req_url) {
		//alert(this.responseText);
		var data = JSON.parse(http_req.responseText);
		if (data.request_result == "OK") {
			var table_views = $id("main-tables-views");
			var data_rows = data.rows;
			var table_rows = "";
			for (var i = 0, len = data_rows.length; i < len; ++i) {
				var row = data_rows[i];
				table_rows += "<tr><td>" + row.id + "</td><td>" + row.name + "</td><td>" + row.is_view + "</td></tr>";
			}
			table_views.tBodies[0].innerHTML = table_rows;
			var dataTab = $id("tab-table-view-raw-data");
			dataTab.click();
			hideShowSystemTablesFromList($id("hide-sys-tables-cbx"));
		} else alert(data.request_error);
	});
}

function showDetails(tab_title) {
	var curr_selected = getCurrentSelectedTableView();

	switch (tab_title) {
	case "Raw Data":
		//showDataFor(curr_selected);
		break;
	case "Data":
		//showDataFor(curr_selected);
		break;
	case "Meta Data":
		showMetaDataFor(curr_selected);
		break;
	case "Fields":
		showFieldsFor(curr_selected);
		break;
	case "Indexes":
		showIndexesFor(curr_selected);
		break;
	case "Triggers":
		showTriggersFor(curr_selected);
		break;
	case "Schema":
		showSchemaFor(curr_selected);
		break;
	case "References":
		showReferencesInSchemaFor(curr_selected);
		break;
	}
}

function detailsChanged(tabId) {
	var elm = document.getElementById('tabs-details');
	var detailTab = elm.children[tabId + 1];
	var tab_title = JsLayoutManager.tabsGetTabTitle(detailTab);
	
	/*
	var messages = $id("ta-messages");
	messages.value = tabId + ":" + detailTab + ":" + tab_title;
	*/
	if(!tab_title) return; //prevent erase tab inner elements
	ide_globals.tab_details_selected = tab_title;
	clearViewsCache();
	showDetails(tab_title);
}

function appMenuCvtCodeToLabel()
{
	var form = getFirstChildWithTagName(getDynContentElement(), "FORM");
	if(form)
	{
		var code = form.elements["code"];
		if(code)
		{
			code.form.className = "slmignore";
			code.onchange = function(event)
			{
				var the_code = getEventSource(event);
				var label = the_code.form.elements["label"];
				if(label && label.value == "") label.value = mkLabel(the_code.value);
			};
		}
	}
}

var saved_DoViewEditRecord = null;
function ideDoViewEditRecord(id, options)
{
	var curr_view = getViewsCacheTop();
	if(curr_view && curr_view.options && id)
	{
		var dbtable = curr_view.dbtable;
		if(dbtable == "__table_metadata_fields")
		{
			var select_input_id = getObjectKey(curr_view.options, "input_id", false);
			if(select_input_id)
			{
				makeGetRequest(the_api_base_uri + dbtable + "/" + id + ".json", 
						function(http_req, req_url){
							//alert(this.responseText);
							var data = JSON.parse(http_req.responseText);
							id = data.rows[0][data.columns.indexOf("field_id")];
							saved_DoViewEditRecord(id, options);
						});
				return false;
			}
		}
	}
	return saved_DoViewEditRecord(id, options);
}

function applyLayoutToBody() {
	if(!the_api_base_uri) the_api_base_uri = "/api/odoo/";
	var i, len, layout, children = document.body.children;
	for (i = 0, len = children.length; i < len; ++i) {
		layout = children[i].getAttribute('data-layout');
		if (layout) {
			JsLayoutManager.manageLayout(children[i]);
		}
	}
	detailsChanged(0);
	loadTablesViews();
	addEditFormAfterCreation("__app_menu", appMenuCvtCodeToLabel);
	//saved_DoViewEditRecord = doViewEditRecord;
	//doViewEditRecord = ideDoViewEditRecord;
}
window.onload = applyLayoutToBody;