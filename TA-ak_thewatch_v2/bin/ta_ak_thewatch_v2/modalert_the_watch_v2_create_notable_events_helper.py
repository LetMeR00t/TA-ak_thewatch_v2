import os
import sys
import re

if sys.version_info[0] < 3:
    py_version = "aob_py2"
else:
    py_version = "aob_py3"

ta_name = 'TA-ak_thewatch_v2'
ta_lib_name = 'ta_ak_thewatch_v2'
pattern = re.compile(r"[\\/]etc[\\/]apps[\\/][^\\/]+[\\/]bin[\\/]?$")
new_paths = [path for path in sys.path if not pattern.search(path) or ta_name in path]
new_paths.insert(0, os.path.sep.join([os.path.dirname(__file__), ta_lib_name]))
new_paths.insert(0, os.path.sep.join([os.path.dirname(__file__), ta_lib_name, py_version]))
sys.path = new_paths

import json
import re
import ipaddress
import sys

# encoding = utf-8

def process_event(helper, *args, **kwargs):
    """
    # IMPORTANT
    # Do not remove the anchor macro:start and macro:end lines.
    # These lines are used to generate sample code. If they are
    # removed, the sample code will not be updated when configurations
    # are updated.

    [sample_code_macro:start]

    # The following example gets and sets the log level
    helper.set_log_level(helper.log_level)

    # The following example gets account information
    user_account = helper.get_user_credential("<account_name>")

    # The following example gets the alert action parameters and prints them to the log
    index = helper.get_param("index")
    helper.log_info("index={}".format(index))


    # The following example adds two sample events ("hello", "world")
    # and writes them to Splunk
    # NOTE: Call helper.writeevents() only once after all events
    # have been added
    helper.addevent("hello", sourcetype="sample_sourcetype")
    helper.addevent("world", sourcetype="sample_sourcetype")
    helper.writeevents(index="summary", host="localhost", source="localhost")

    # The following example gets the events that trigger the alert
    events = helper.get_events()
    for event in events:
        helper.log_info("event={}".format(event))

    # helper.settings is a dict that includes environment configuration
    # Example usage: helper.settings["server_uri"]
    helper.log_info("server_uri={}".format(helper.settings["server_uri"]))
    [sample_code_macro:end]
    """

    helper.log_info("Alert action the_watch_create_notable_events started.")

    # Get parameters
    index = helper.get_param("index")
    sourcetype = "stash_thewatchv2_notable_events"
    source = "thewatchv2_create_notable_events"

   # Process events
    events = helper.get_events()
    for event in events:
        event_processed = {}
        artifacts = []
        thewatch_artifact_matched_fields = []
        thewatch_artifact_matched_keys = []
        
        # Find artifact in the event to find them in other fields
        if ("thewatch_artifact" in event):
            artifacts = remove_duplicates([v[1:len(v)-1] for v in event["__mv_thewatch_artifact"].split(";")]) if "__mv_thewatch_artifact" in event and event["__mv_thewatch_artifact"]!="" else [event["thewatch_artifact"]]
            artifacts = [o.replace("*",".*") for o in artifacts]
        
        helper.log_debug("Keys: "+str(event.keys()))
        
        for k in event.keys():
            helper.log_debug("Process key "+k)
            if (event[k]!=""):
                # 1) It's a specific Splunk keyword that need to be keep in the new index as a specific field
                if (k in ["index","sourcetype","source","_raw","eventtype","tag::eventtype","tag","_time","_indextime"]):
                    helper.log_debug("Processed by 1")
                    event_processed["orig_"+k.replace("_","")] = event[k]
                # 2) All thewatch_* fields (except the event_id) that are single value should be processed as a multivalue field with one value (for a better processing in the new index)
                elif ((k.startswith("thewatch_") and k not in ["thewatch_alert_id","thewatch_event_id"]) and "orig_"+k not in event_processed):
                    helper.log_debug("Processed by 2")
                    event_processed["orig_"+k] = [event[k]]
                    # We check a specific field in order to determine the type of the artefact
                    case_id_field = re.search("thewatch_artifact_(.*)_case_id",k)
                    if (case_id_field and "orig_thewatch_type" in event_processed):
                        event_processed["orig_thewatch_type"] = event_processed["orig_thewatch_type"] + [case_id_field.group(1)]
                    elif (case_id_field):
                        event_processed["orig_thewatch_type"] = [case_id_field.group(1)]
                # 3) All multivalued fields must be processed for the new index with a specific treatment for multivalued thewatch_* fields
                elif (k.startswith("__mv")):
                    helper.log_debug("Processed by 3")
                    if k.startswith("__mv_thewatch") or k.startswith("__mv_eventtype") or k.startswith("__mv_tag"):
                        prefix = "orig_"
                    else:
                        prefix = ""
                    # list(dict.fromkeys(...)) is used to remove duplicate fields (ex: two artifacts with the same case id)
                    event_processed[prefix+k.replace("__mv_","")] = remove_duplicates([v[1:len(v)-1] for v in event[k].split(";")])
                    # We check a specific field in order to determine the type of the artefact
                    case_id_field = re.search("thewatch_artifact_(.*)_case_id",k)
                    if (case_id_field and "orig_thewatch_type" in event_processed):
                        event_processed["orig_thewatch_type"] = event_processed["orig_thewatch_type"] + [case_id_field.group(1)]
                    elif (case_id_field):
                        event_processed["orig_thewatch_type"] = [case_id_field.group(1)]
                # 4) Default processing for other fields
                elif (not k.startswith("_") and k not in event_processed and "orig_"+k not in event_processed):
                    helper.log_debug("Processed by 4")
                    event_processed[k] = event[k]
                else:
                    helper.log_debug("Key not processed")
        
        for k in event_processed.keys():
            # Check if the field is matching one artifact
            matched_values = is_artifact_in_field(k, event_processed[k], artifacts, helper)

            if (len(matched_values) > 0):
                thewatch_artifact_matched_fields += [k+" == "+v for v in matched_values]
                thewatch_artifact_matched_keys += [event["sourcetype"]+" == "+k]

        # Add search ID
        event_processed["thewatch_sid"] = helper.settings["sid"]
        # Add fields that matched artifacts
        event_processed["orig_thewatch_artifact_matched_fields"] = remove_duplicates(thewatch_artifact_matched_fields)
        # Add keys that matched artifacts
        event_processed["orig_thewatch_artifact_matched_keys"] = remove_duplicates(thewatch_artifact_matched_keys)
        # Add event for indexation to Splunk
        helper.addevent(json.dumps(event_processed), sourcetype=sourcetype, cam_header=False)
    
    # Store events
    helper.writeevents(index=index, source=source, host=helper.settings["server_host"], fext="thewatchv2_notable_events")

    return 0
    
# This function is returning a list of values (from "values") that matched one of the artifacts.
# param: field - The field to process
# param: values - A list of values for the given field
# param: artifacts - The list of artifacts of the event
# Returns an empty list if no value is matching one artifact
def is_artifact_in_field(field, values, artifacts, helper):
    
    result = []
    ip_pattern = "^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"
    ip_network_pattern = "^(?:[0-9]{1,3}\.){3}[0-9]{1,3}(?:\/\d+)?$"
    
    if (not isinstance(values,list)):
        values = [values]

    for v in values:
        
        # Check if the value is an IP
        if (re.search(ip_pattern,v)):
            value = ipaddress.ip_address(v)
        else:
            value = v
       
        # Check if the value match one of the artifact
        if (not re.search("thewatch|eventtype|tag|orig_raw",field)):
            for o in artifacts:
                # Check if the artifact is an IP/network
                if (isinstance(value,ipaddress.IPv4Address) and re.search(ip_network_pattern,o)):
                    artifact = ipaddress.ip_network(o)
                    if (value in artifact):
                        result.append(v)
                else:
                    artifact = o
                    if re.search(artifact,v,flags=re.IGNORECASE):
                        result.append(v)
          
    return result

# Remove duplicates from a given list
def remove_duplicates(l):
    return list(dict.fromkeys(l))
