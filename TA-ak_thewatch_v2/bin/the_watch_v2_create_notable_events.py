
# encoding = utf-8
# Always put this line at the beginning of this file
import ta_ak_thewatch_v2_declare

import os
import sys

from alert_actions_base import ModularAlertBase
import modalert_the_watch_v2_create_notable_events_helper

class AlertActionWorkerthe_watch_v2_create_notable_events(ModularAlertBase):

    def __init__(self, ta_name, alert_name):
        super(AlertActionWorkerthe_watch_v2_create_notable_events, self).__init__(ta_name, alert_name)

    def validate_params(self):

        if not self.get_param("index"):
            self.log_error('index is a mandatory parameter, but its value is None.')
            return False
        return True

    def process_event(self, *args, **kwargs):
        status = 0
        try:
            if not self.validate_params():
                return 3
            status = modalert_the_watch_v2_create_notable_events_helper.process_event(self, *args, **kwargs)
        except (AttributeError, TypeError) as ae:
            self.log_error("Error: {}. Please double check spelling and also verify that a compatible version of Splunk_SA_CIM is installed.".format(str(ae)))
            return 4
        except Exception as e:
            msg = "Unexpected error: {}."
            if e:
                self.log_error(msg.format(str(e)))
            else:
                import traceback
                self.log_error(msg.format(traceback.format_exc()))
            return 5
        return status

if __name__ == "__main__":
    exitcode = AlertActionWorkerthe_watch_v2_create_notable_events("TA-ak_thewatch_v2", "the_watch_v2_create_notable_events").run(sys.argv)
    sys.exit(exitcode)
