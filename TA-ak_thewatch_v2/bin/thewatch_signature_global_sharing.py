# encoding = utf-8
import sys, os
import ta_ak_thewatch_v2_declare
import splunklib.client as client
from ta_logging import setup_logging 
import splunk.Intersplunk

if __name__ == '__main__':
    
    # First, parse the arguments
    # get the keywords and options passed to this command
    keywords, options = splunk.Intersplunk.getKeywordsAndOptions()

    logger = setup_logging("thewatch_automatic_global_sharing")

    # Check the existence of the instance_id
    if len(keywords) == 3:
        signature_name = keywords[0]
        sharing = keywords[1]
        owner = keywords[2]
    else:
        logger.error("[PARAMETER MISSING] No signature name was provided as parameter")
        exit(1)

    # get the previous search results
    results,dummyresults,settings = splunk.Intersplunk.getOrganizedResults()

    # Initialiaze settings
    spl = client.connect(app="TA-ak_thewatch_v2",owner="nobody",token=settings["sessionKey"])

    # Modify eventtype
    if (sharing in ["user","app","global"]):
       spl.post('saved/eventtypes/'+signature_name+'/acl', body="sharing="+sharing+"&owner="+owner)

    splunk.Intersplunk.outputResults(results)
