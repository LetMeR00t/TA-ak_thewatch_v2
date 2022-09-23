var app_name = "";
var user = "";
var defaultTokenModel = "";
var submittedTokenModel = "";
var qualifications = {}
var service = "";
var service_kvstore = "";

// UTILS FUNCTIONS
require(["splunkjs/mvc/utils"], function (SplunkUtil) {
    "use strict";

    app_name = SplunkUtil.getCurrentApp();
    user = Splunk.util.getConfigValue("USERNAME");

});

// This function is used to lighten or darken colors
function lighten_darken_color(col, amt) {
    var num = parseInt(col, 16);
    var r = (num >> 16) + amt;
    var b = ((num >> 8) & 0x00FF) + amt;
    var g = (num & 0x0000FF) + amt;
    var newColor = g | (b << 8) | (r << 16);
    return newColor.toString(16);
}

// This function is used to test if a string can be parsed as a JSON
function stringToJSON(str) {
    var json = null
    try {
        json = JSON.parse(str);
    } catch (e) {
        return json;
    }
    return json;
}

// This function is used to sleep when needed
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}




// Define the "Signature" object which is an eventtype ++
class Signature {
    constructor(name, search = null, priority = null, color = null, tags = [], description = {}, key = null, qualification_id = null, time = null) {
        // String: Name of the eventtype
        this.name = name;
        // String: Search used by the eventtype
        this.search = search;
        // Integer: Priority of the eventtype
        this.priority = priority;
        // String : Color of the eventtype
        this.color = color
        // List<String>: List of tags
        this.tags = tags;
        // JSON object that contains all the description
        this.description = description;
        // String : Owner of the eventtype
        this.owner = user;
        // String : App of the eventtype
        this.app = app_name;
        // String : Key used by the qualification
        this.key = key;
        // String : Qualification ID used by this signature
        this.qualification_id = qualification_id;
        // Integer : Timestamp used to create the name and representing the time when the signature was created
        this.time = time;
        // Integer: Version of The Watch to use for this signature
        this.thewatch_version = 2;
    }

    // This function is used to recover an existing eventtype and store it as a Signature instance
    async get_eventtype() {
        var self = this;
        // Create a service and do a GET request 
        return service.get('saved/eventtypes', { "output_mode": "json", "count": 0, "search": this.name }, async function (err, response) {
            if (err) {
                // Something is not working during the recovering process
                console.error("Error: ", response.err);
            }
            else if (response.status === 200) {
                console.debug("Eventtypes recovered, get the first element of results");
                if (response.data.entry.length == 0) {
                    console.error("No eventtype was found with this name: \"" + self.name + "\"");
                } else if (response.data.entry.length == 1) {
                    var eventtype = response.data.entry[0];
                    console.debug("Only one eventtype was found, this is a correct behavior", eventtype);
                    self.name = eventtype["name"];
                    self.search = eventtype["content"]["search"];
                    self.priority = eventtype["content"]["priority"];
                    self.color = eventtype["content"]["color"];
                    self.tags = eventtype["content"]["tags"];

                    // check if JSON detected
                    var description = stringToJSON(eventtype["content"]["description"])
                    if (description != null) {
                        self.description = JSON.parse(eventtype["content"]["description"]);
                        self.thewatch_version = 2;

                        var regexp_eventtype_name = /thewatchQ_P\d+_(?<key>[^_]+)_(?<qualification_id>[^_]+)_(?<time>[^_]+)/g;
                        var name_elements = regexp_eventtype_name.exec(self.name).groups;
                        self.key = name_elements["key"];
                        self.qualification_id = name_elements["qualification_id"];
                        self.time = name_elements["time"];

                    }
                    else {
                        self.description = eventtype["content"]["description"];
                        self.thewatch_version = 1;
                    }

                    // Get the owner/app information
                    self.owner = eventtype["acl"]["owner"];
                    self.app = eventtype["acl"]["app"];
                }
                else {
                    console.warn("More than one eventtype (" + response.data.entry.length + " elements) were found for this name: \"" + self.name + "\"");
                }
            }
            else {
                console.log('Status: ', response.status, 'Response: ', response.data);
            }
        });
    }

    // This function is used to add a new eventtype
    async create_eventtype() {
        var self = this;
        // Create a service and do a POST request 
        await service.post('saved/eventtypes', { "name": this.name, "search": this.search, "description": JSON.stringify(this.description), "priority": this.priority, "color": this.color, "tags": this.tags.join(", ") }, function (err, response) {
            if (err) {
                // Something is not working during the recovering process
                console.error("Error: ", response.err);
            }
            else if (response.status === 201) {
                console.debug("Eventtype \"" + self.name + "\" successfully created");
            }
            else {
                console.log('Status: ', response.status, 'Response: ', response.data);
            }
        });
        await this.update_acl_sharing(user, "app", false);
        // Now, let's share it to "global"
        await this.update_acl_sharing("nobody", "global", true);
    }

    // This function is used to update an existing eventtype
    async update_eventtype() {
        // As the eventtype is not keeping ACL sharing, we need to remove it and create it again
        var self = this;
        // Delete old eventtype
        await this.remove_eventtype();
        // Update fields of event
        this.name = "thewatchQ_P" + this.priority + "_" + this.key + "_" + this.qualification_id + "_" + this.time;
        this.description["author"] = user;
        this.description["time"] = new Date().getTime() / 1000;
        // Create the eventtype updated
        await this.create_eventtype();
    }


    // This function is used to remove an existing eventtype
    async remove_eventtype() {
        var self = this;
        // Create a service and do a DELETE request 
        return service.del('saved/eventtypes/' + this.name, {}, function (err, response) {
            if (err) {
                // Something is not working during the recovering process
                console.error("Error: ", response.err);
            }
            else if (response.status === 200) {
                console.debug("Eventtype \"" + self.name + "\" successfully deleted");
            }
            else {
                console.log('Status: ', response.status, 'Response: ', response.data);
            }
        });
    }

    // This function is used to update ACL sharing (user, app or global) of an eventtype
    async update_acl_sharing(owner, sharing, use_python_script) {
        var response = null;
        var self = this;
        if (use_python_script === false) {
            response = service.post('saved/eventtypes/' + this.name + '/acl', { "owner": owner, "sharing": sharing }, function (err, response) {

                if (err) {
                    // Something is not working during the recovering process
                    console.error("Error: ", response.err);
                }
                else if (response.status === 200) {
                    console.debug("Eventtype \"" + self.name + "\" successfully shared to \"" + sharing + "\" only with owner \"" + owner + "\"");
                }
                else {
                    console.log('Status: ', response.status, 'Response: ', response.data);
                }
            });
        } else {
            response = service.post('saved/searches/[The Watch] Automatically set global sharing to a signature/dispatch', { "args.signature_name": self.name, "args.sharing": sharing, "args.owner": owner }, function (err, response) {
                if (err) {
                    // Something is not working during the recovering process
                    console.error("Error: ", response.err);
                }
                else if (response.status === 201) {
                    console.debug("Eventtype \"" + self.name + "\" successfully shared to \"" + sharing + "\" with owner \"" + owner + "\" using the python script");
                }
                else {
                    console.log('Status: ', response.status, 'Response: ', response.data);
                }
            });
        }
        await response;
        return response;

    }

    // This function is used to recover kvstore information
    // Parameters are the name of the kvstore, a filter on data and how sort data
    static async get_kvstore_data(name, filter, sort) {
        var self = this;
        var kvstore = null;
        await service_kvstore.get('storage/collections/data/' + name, { "query": JSON.stringify(filter), "sort": sort }, function (err, response) {
            if (err) {
                // Something is not working during the recovering process
                console.error("Error: ", response.err);
            }
            else if (response.status === 200) {
                console.debug("KVStore data of \"" + name + "\" successfully recovered");
                kvstore = {};
                if (response.data.length > 1) {
                    response.data.forEach(element => kvstore[element["id"]] = element);
                }
                else {
                    kvstore = response.data[0];
                }
            }
            else {
                console.log('Status: ', response.status, 'Response: ', response.data);
            }
        });
        return kvstore;
    }

    // This function is used to add new data to a kvstore
    // Parameters are the name of the kvstore and the data as a dictionnary
    static async add_data_to_kvstore(name, data) {
        var self = this;
        var new_key = null;
        await service_kvstore.request('storage/collections/data/' + name, "POST", "", "", JSON.stringify(data), { "Content-Type": "application/json" }, function (err, response) {
            if (err) {
                // Something is not working during the recovering process
                console.error("Error: ", response.err);
            }
            else if (response.status === 201) {
                console.debug("New data was successfully added to the KVStore \"" + name + "\"");
                new_key = response.data["_key"];
            }
            else {
                console.log('Status: ', response.status, 'Response: ', response.data);
            }
        });
        return new_key;
    }

};

async function create_signature_from_dashboard(qualification_id) {

    var button = $("#" + qualification_id);
    var comment = submittedTokenModel.get("qualify_comment");
    var reference_number = submittedTokenModel.get("qualify_reference_number");
    var time = parseInt(new Date().getTime() / 1000);
    var time_utc = new Date().toUTCString();

    if (priority != "X" && comment != undefined && comment != "") {

        var name = "thewatchQ_P" + priority + "_" + button.attr("key") + "_" + qualification_id + "_" + time;
        var signature = new Signature(name, qualify_text, priority, button.attr("color"), [], { "details": comment, "reference_number": reference_number, "tag_id": submittedTokenModel.get("qualify_tag"), "time": new Date().getTime() / 1000, "author": user }, button.attr("key"), qualification_id, time);
        await signature.create_eventtype();
        console.log("Signature \"" + signature.name + "\" is created");

        defaultTokenModel.set("log", time_utc + ": The new signature \"" + qualify_text + "\" is created (Wait a few minutes before being taken into account by Splunk)");
        submittedTokenModel.set("last_update_signatures", parseInt(new Date().getTime() / 1000));

    } else {
        if (priority == "X") {
            defaultTokenModel.set("log", time_utc + ": The elements provided are not sufficient to determine the priority");
        } else if (comment === undefined || comment === "") {
            defaultTokenModel.set("log", time_utc + ": No comment is provided (it's mandatory)");
        }
    }
}


require(["splunkjs/mvc",
    "splunkjs/mvc/simplexml/ready!"
], function (mvc) {

    defaultTokenModel = mvc.Components.get("default");
    submittedTokenModel = mvc.Components.get("submitted");
    service = mvc.createService();
    service_kvstore = mvc.createService();
    service_kvstore["owner"] = "nobody";

    // 
    // CODE FOR THE MANAGEMENT DASHBOARD
    //
    // Get the "Modify" table
    var modifyTable = mvc.Components.get('modifytable');
    var deleteTable = mvc.Components.get('deletetable');

    if (modifyTable !== undefined && deleteTable !== undefined) {
        // Respond to a click event
        modifyTable.on("click", async function (e) {
            // Prevent drilldown from redirecting away from the page
            e.preventDefault();

            var field = e["data"]["click.name2"];

            if (["Search", "Comment", "Reference Number"].includes(field)) {
                // Load existing value
                input = mvc.Components.getInstance("id_edit_" + field.toLowerCase().replaceAll(" ", "_"));
                input.val(e["data"]["click.value2"].replace("⬆️ ", ""));
                input.render();
                console.debug("Value of the \"" + field + "\" field was preloaded");
            }
            else {
                // Perform actions
                let s = new Signature(e["data"]["row.Name"]);
                var response = await s.get_eventtype();
                var default_value = null;
                var input = null;
                var token = null;
                var execute_update = true;
                switch (field) {
                    case "Priority":
                        token = submittedTokenModel.get("edit_priority");
                        if (token) {
                            s.priority = token;
                        }
                        else { console.error("No priority was provided"); execute_update = false; }
                        break;
                    case "Actions":
                        // Find which action was selected
                        var action = e["data"]["click.value2"];
                        switch (action) {
                            case "❌ TheWatch v1 signature":
                                console.debug("Unable to Migrate old version signatures to The Watch V2, Will be done through a script, ask Cyber Defense team");
                                break;
                            case "▶️ Edit search":
                                token = submittedTokenModel.get("edit_search");
                                if (token && token != "") {
                                    s.search = token;
                                }
                                else { console.error("No search was provided"); execute_update = false; }
                                break;
                            case "▶️ Edit comment":
                                token = submittedTokenModel.get("edit_comment");
                                if (token && token != "") {
                                    s.description["details"] = token;
                                }
                                else { console.error("No comment was provided"); execute_update = false; }
                                break;
                            case "▶️ Edit reference number️":
                                token = submittedTokenModel.get("edit_reference_number");
                                if (token && token != "") {
                                    s.description["reference_number"] = token;
                                }
                                else { console.error("No reference number was provided"); execute_update = false; }
                                break;
                            default:
                                console.error("This action (" + action + ") is not handled");
                                execute_update = false;
                        }
                }
                if (execute_update) {

                    // Console feedback
                    console.log("Update eventtype with id \"" + e["data"]["row.Name"] + "\" on field \"" + field + "\"");

                    await s.update_eventtype();

                    // Refresh dashboard
                    submittedTokenModel.set("last_refresh", new Date().getTime());
                }
            }

        });

        // Respond to a click event
        deleteTable.on("click", async function (e) {
            // Prevent drilldown from redirecting away from the page
            e.preventDefault();

            // Console feedback
            console.log("Delete eventtype with name \"" + e["data"]["row.Name"] + "\"");

            // Perform actions
            let s = new Signature(e["data"]["row.Name"]);
            response = await s.get_eventtype();
            s.remove_eventtype();

            // Refresh dashboard
            submittedTokenModel.set("last_refresh", new Date().getTime());
        });
    }

    // 
    // CODE FOR THE DETECTION DASHBOARD
    //
    // Listen for a change to the token value
    submittedTokenModel.on("change:last_update", function (model, value, options) {

        console.log("Refresh the signature initiated");

        // Get all tokens
        var sourcetype = submittedTokenModel.get("qualify_sourcetype");
        var events_with_same = submittedTokenModel.get("qualify_events_with_same");
        var field_value = submittedTokenModel.get("qualify_field_value");
        var input_qualify_field_value = mvc.Components.getInstance("input_qualify_field_value");
        var artifact = submittedTokenModel.get("qualify_artifact");
        var input_qualify_artifact = mvc.Components.getInstance("input_qualify_artifact");
        var case_name = submittedTokenModel.get("qualify_case");
        var action = submittedTokenModel.get("qualify_action");
        var mode = submittedTokenModel.get("qualify_mode");

        qualify_visual = "I qualify ";
        qualify_text = "";
        priority = "X";

        // Set visual and text
        // Is similar, equivalent or linked events ?
        qualify_word = "";
        qualify_with = "";
        if (events_with_same == "case") {
            if (case_name != undefined) {
                // D6
                priority = 6;
                qualify_visual += "linked events (P6) event concerning the case ID \"" + case_name + "\"";
                qualify_text += "thewatch_artifact_case_id=\"" + case_name + "\"";
            }
        }
        else if (events_with_same == "artifact") {
            // D4 or D5
            if (input_qualify_artifact.val().length > 0) {
                priority = (sourcetype === "any" ? 5 : 4);
                qualify_visual += "equivalent events (P" + priority + ")";
                qualify_with = (artifact != undefined ? "thewatch_artifact=" + artifact : "");
            }
        }
        else if (events_with_same == "value") {
            // D1 or D2 or D3
            if (input_qualify_field_value.val().length > 0) {
                priority = (sourcetype === "any" ? 3 : (input_qualify_field_value.val().length == 1 ? 2 : 1));
                qualify_visual += "similar events (P" + priority + ")";
                qualify_with = (field_value != undefined ? field_value : "");
            }
        }

        if (sourcetype != "any") {
            qualify_visual += " on the sourcetype \"" + sourcetype + "\"";
            qualify_text += " original_sourcetype=\"" + sourcetype + "\" ";
        }

        if (qualify_with != "") {
            qualify_visual += " with (" + qualify_with.replace(/" ([^=]+)=/g, "\" AND $1=") + ")";
            qualify_text += qualify_with;
        }

        if (action != "any") {
            qualify_visual += " and action equals to \"" + action + "\"";
            qualify_text += " action=\"" + action + "\"";
        }

        qualify_visual += " as:";
        if (mode == "visual") {
            defaultTokenModel.set("final_qualification", qualify_visual);
        }
        else if (mode == "text") {
            defaultTokenModel.set("final_qualification", qualify_text);
        }

    });

    // Listen for a change to the token value
    submittedTokenModel.on("change:qualify_value", function (model, value, options) {

        if (typeof value != typeof undefined && value != "" && value != "__other__") {
            var input_qualify_field_value = mvc.Components.getInstance("input_qualify_field_value");
            var input_qualify_field_comparaison = mvc.Components.getInstance("input_qualify_comparaison").val();
            var input_qualify_field = mvc.Components.getInstance("input_qualify_field").val();

            var value_sanitized = value.replaceAll("\\", "\\\\").replace(/"/g, "\\\"")

            // Build new value
            var new_field_value = input_qualify_field_value.val();
            if (["=", "!="].includes(input_qualify_field_comparaison)) {
                value_sanitized = "\"" + value_sanitized + "\""
            }
            new_field_value.push(input_qualify_field + input_qualify_field_comparaison + value_sanitized);

            // Build the mapping
            var mapping = {};

            for (var i = 0; i < new_field_value.length; i++) {

                // Get the current value by replacing the "IN" by "="
                var current_value_groups = new_field_value[i].replace(/NOT (\w+) IN \(([^)]+)\)/, "$1!=$2").replace(/ IN \(([^)]+)\)/g, "=$1").match("^([^<!=>\r\n]+)((?:<=|>=|!=|<|>|=))([^\r\n]+)$");
                var current_field = current_value_groups[1]
                var current_comparaison = current_value_groups[2]
                var current_values = current_value_groups[3].split(",")

                for (var j = 0; j < current_values.length; j++) {
                    var current_value = current_values[j]
                    if (current_field in mapping) {
                        if (current_comparaison in mapping[current_field]) {
                            mapping[current_field][current_comparaison].push(current_value);
                        }
                        else {
                            mapping[current_field][current_comparaison] = [current_value];
                        }
                    }
                    else {
                        var new_current_field = {}
                        new_current_field[current_comparaison] = [current_value]
                        mapping[current_field] = new_current_field;
                    }
                }

            }

            // Render the new_field_value
            new_field_value = [];
            for (var field in mapping) {
                for (var comparaison in mapping[field]) {
                    if (comparaison == "=" && mapping[field][comparaison].length > 1) {
                        new_field_value.push(field + " IN (" + mapping[field][comparaison].join(",") + ")");
                    }
                    else if (comparaison == "!=" && mapping[field][comparaison].length > 1) {
                        new_field_value.push("NOT " + field + " IN (" + mapping[field][comparaison].join(",") + ")");
                    }
                    else if (["=", "!="].includes(comparaison)) {
                        new_field_value.push(field + comparaison + mapping[field][comparaison][0]);
                    }
                    else {
                        for (var i = 0; i < mapping[field][comparaison].length; i++) {
                            new_field_value.push(field + comparaison + mapping[field][comparaison][i]);
                        }
                    }
                }
            }

            // Set the value and render it
            input_qualify_field_value.val(new_field_value);
            submittedTokenModel.set("qualify_field_value", new_field_value.join(" "));
            input_qualify_field_value.render();

        }

    });

    // Listen for a change to the token value
    submittedTokenModel.on("change:qualify_other_value", function (model, value, options) {

        if (typeof value != typeof undefined && value != "" && value != "__other__") {
            var input_qualify_field_value = mvc.Components.getInstance("input_qualify_field_value");
            var input_qualify_field_comparaison = mvc.Components.getInstance("input_qualify_comparaison").val();
            var input_qualify_field = mvc.Components.getInstance("input_qualify_field").val();

            var value_sanitized = value.replaceAll("\\", "\\\\").replace(/"/g, "\\\"")

            // Build new value
            var new_field_value = input_qualify_field_value.val();
            if (["=", "!="].includes(input_qualify_field_comparaison)) {
                value_sanitized = "\"" + value_sanitized + "\""
            }
            new_field_value.push(input_qualify_field + input_qualify_field_comparaison + value_sanitized);

            // Build the mapping
            var mapping = {};

            for (var i = 0; i < new_field_value.length; i++) {

                // Get the current value by replacing the "IN" by "="
                var current_value_groups = new_field_value[i].replace(/NOT (\w+) IN \(([^)]+)\)/, "$1!=$2").replace(/ IN \(([^)]+)\)/g, "=$1").match("^([^<!=>\r\n]+)((?:<=|>=|!=|<|>|=))([^\r\n]+)$");
                var current_field = current_value_groups[1]
                var current_comparaison = current_value_groups[2]
                var current_values = current_value_groups[3].split(",")

                for (var j = 0; j < current_values.length; j++) {
                    var current_value = current_values[j]
                    if (current_field in mapping) {
                        if (current_comparaison in mapping[current_field]) {
                            mapping[current_field][current_comparaison].push(current_value);
                        }
                        else {
                            mapping[current_field][current_comparaison] = [current_value];
                        }
                    }
                    else {
                        var new_current_field = {}
                        new_current_field[current_comparaison] = [current_value]
                        mapping[current_field] = new_current_field;
                    }
                }

            }

            // Render the new_field_value
            new_field_value = [];
            for (var field in mapping) {
                for (var comparaison in mapping[field]) {
                    if (comparaison == "=" && mapping[field][comparaison].length > 1) {
                        new_field_value.push(field + " IN (" + mapping[field][comparaison].join(",") + ")");
                    }
                    else if (comparaison == "!=" && mapping[field][comparaison].length > 1) {
                        new_field_value.push("NOT " + field + " IN (" + mapping[field][comparaison].join(",") + ")");
                    }
                    else if (["=", "!="].includes(comparaison)) {
                        new_field_value.push(field + comparaison + mapping[field][comparaison][0]);
                    }
                    else {
                        for (var i = 0; i < mapping[field][comparaison].length; i++) {
                            new_field_value.push(field + comparaison + mapping[field][comparaison][i]);
                        }
                    }
                }
            }

            // Set the value and render it
            input_qualify_field_value.val(new_field_value);
            submittedTokenModel.set("qualify_field_value", new_field_value.join(" "));
            input_qualify_field_value.render();

            // Clean the other value
            mvc.Components.getInstance("input_qualify_other_value").val("");

        }
    });

    // Listen for a change to the token value
    submittedTokenModel.on("change:qualify_tag", async function (model, value, options) {
        // BUTTONS ALERT ACTIONS
        var all_alert_actions_buttons = $("#all_alert_actions");
        all_alert_actions_buttons.empty();

        var alert_id = submittedTokenModel.get("thewatch_analysis_value");
        all_alert_actions_buttons.append("<button id=\"" + alert_id + "\" class=\"btn custom_btn alert_action\"\">Close " + submittedTokenModel.get("thewatch_analysis_value_shown") + "</button>");

        // Set action on alert close button
        $("#" + alert_id).on('click', "", async function (e) {
            // Prevent drilldown from redirecting away from the page
            e.preventDefault();
            var alert_id = submittedTokenModel.get("thewatch_analysis_value");
            console.debug("Closing alert \"" + alert_id + "\"");
            await Signature.add_data_to_kvstore("kv_ak_thewatch_alerts", { "id": alert_id, "time": parseInt(new Date().getTime() / 1000), "user": user });
            // Update tokens
            submittedTokenModel.unset("thewatch_analysis_type");
            submittedTokenModel.unset("thewatch_analysis_type_alert");
            submittedTokenModel.unset("thewatch_analysis_type_case_qualification");
            submittedTokenModel.unset("thewatch_analysis_case");
            submittedTokenModel.unset("thewatch_analysis_field");
            submittedTokenModel.unset("thewatch_analysis_value");
            submittedTokenModel.unset("thewatch_analysis_value_shown");
            submittedTokenModel.unset("thewatch_analysis_qualification");
            submittedTokenModel.unset("thewatch_analysis_earliest_time");
            submittedTokenModel.unset("thewatch_analysis_latest_time");
            submittedTokenModel.unset("thewatch_analysis_tag");
            submittedTokenModel.set("last_update_signatures", parseInt(new Date().getTime() / 1000));

        });


        // BUTTONS QUALIFICATION
        var all_qualify_buttons = $("#all_qualify_buttons");
        all_qualify_buttons.empty();

        if (value !== undefined) {
            qualifications = {}
            var tag = await Signature.get_kvstore_data("kv_ak_thewatch_tags", { "id": value }, "id");
            var labels = await Signature.get_kvstore_data("kv_ak_thewatch_qualification_labels", { "set_id": tag["set_id"] }, "priority,key");
            for (const label in labels) {
                var regexp_color_code = /(?<et_color>\w+) \((?<color>[^)]+)\)/g;
                var color_code = regexp_color_code.exec(labels[label]["color"]).groups;

                var qualification_id = label;
                var qualification_text = labels[label]["name"];
                var qualification_color = color_code["color"];
                qualifications[qualification_id] = { "text": qualification_text, "color": qualification_color };

                all_qualify_buttons.append("<button id=\"" + qualification_id + "\" key=\"" + labels[label]["key"] + "\" color=\"et_" + color_code["et_color"] + "\" class=\"btn custom_btn\"\">" + qualification_text + "</button>");
                // Set default color
                var button = $("#" + qualification_id);
                button.css("background-color", qualification_color);

                // Respond to a click event
                button.on('click', "", function (e) {
                    // Prevent drilldown from redirecting away from the page
                    e.preventDefault();
                    create_signature_from_dashboard(this["id"]);
                });
            }
            for (const id in qualifications) {
                // Set hover color
                $("#" + id).hover(function () {
                    var color = lighten_darken_color(qualifications[this["id"]]["color"].substring(1), 35);
                    if (color.length !== 6) {
                        color = lighten_darken_color(qualifications[this["id"]]["color"].substring(1), -35);
                    }
                    $(this).css("background-color", "#" + color);
                }, function () {
                    $(this).css("background-color", qualifications[this["id"]]["color"]);
                });
            }

        }
    });

    console.debug("[The Watch] JS script is ready !");
    //runTests();
});

// TEST CASES
async function runTests() {
    // ev1: Eventtype with an already existing signature
    console.log("TESTS ENABLED");
    let ev1 = new Signature("1618574773835");
    response = await ev1.get_eventtype();
    console.log("EV1", ev1);
    // ev2: Signature ID not enough (too much results)
    let ev2 = new Signature("a");
    response = await ev2.get_eventtype();
    console.log("EV2", ev2);
    // ev3: Create a new eventype
    var key = "01-TP"
    var time = parseInt(new Date().getTime())
    var name = "thewatchQ_P1_" + key + "_" + time + "_" + user;
    let ev3 = new Signature(name, search = "thewatch_observable=\"Hello World\"", priority = 1, color = "et_blue", tags = [], description = { "details": "This is a custom comment", "reference_number": "DPTTLISSD-12345", "tag_id": "", "time": time, "user": user }, key, null, time);
    console.log("EV3", ev3);
    response = await ev3.create_eventtype();
    // ev4: Get the new created eventtype, wait for 1 second before doing this (Splunk latence)
    await sleep(2000);
    let ev4 = new Signature(name);
    response = await ev4.get_eventtype();
    console.log("Get eventtype EV4", ev4);
    console.log("Update eventtype EV4");
    ev4.color = "et_red";
    response = await ev4.update_eventtype();
    // ev5: Get the updated eventtype
    await sleep(1000);
    let ev5 = new Signature(name);
    response = await ev5.get_eventtype();
    console.log("Get eventtype EV5 (EV4 modified)", ev5);
    // ev5 bis: Delete the eventtype
    ev5.remove_eventtype();
    console.log("Delete eventtype EV5");
}

