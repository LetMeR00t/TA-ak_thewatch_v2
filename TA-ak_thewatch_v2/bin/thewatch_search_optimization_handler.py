import csv
import json
import ta_ak_thewatch_v2_declare
import splunk.Intersplunk
import splunklib.client as client
from ta_logging import setup_logging

logger = setup_logging("search_optimization_handler")

def main():
    # First, parse the arguments
    # get the keywords and options passed to this command
    keywords, options = splunk.Intersplunk.getKeywordsAndOptions()

    # get the previous search results
    results,dummyresults,settings = splunk.Intersplunk.getOrganizedResults()

    # Initialiaze settings
    spl = client.connect(app="TA-ak_thewatch_v2",owner="nobody",token=settings["sessionKey"])
    logger.info(results)
    
    for r in results:
        if r["sourcetypes"]=="":
            new_definition = "(sourcetype IN (*))"
        else:
            new_definition = "(sourcetype IN (\"" + r["sourcetypes"].replace(" ","\", \"") + "\"))"
        new_type = r["type"]
        if  new_type!="sourcetype":
            logger.info("Editing {} macro, with new definition: {}".format(new_type, new_definition))
            spl.post('properties/macros/THEWATCH_search_'+new_type, definition=new_definition)        
        

main()