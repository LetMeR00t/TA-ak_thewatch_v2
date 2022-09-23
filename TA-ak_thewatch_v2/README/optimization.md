# Optimization of The Watch v2

If your infrastructure cannot handle The Watch searches on the entire infrastructure, you have the possibility to switch from a full detection mode to an optimized mode. 

## Full Detection mode

On the full detection mode, The Watch will search for artifacts on all indexes and sourcetypes (i.e. index=\*, sourcetype=\*). It is a lot ressource consumming, but if your infrastructure supports it, it will provide a full detection mode. You will cover the entirety of your log sources and have a real overview of your system. 

## Optimized Detection mode

On the Optimized Detection Mode, you have specified sourcetypes that will be the references for the working hours. 

Explanation: 

from 6 a.m. to 6 p.m., The Watch will search only on the selected sourcetypes for your optimiztion. 

from 6 p.m. to 6 a.m., The Watch will search on the entire infrastructure. Assuming that it will be less used by employees, and is able to process the searches safely. 

At 6 a.m., The Watch checks wether a new sourcetype has been matchded during the night. If so, it wil be added to the list of the optimized sourcetype. 

## Optimization

In order to go from Full Detection Mode to Optimized Detection Mode:

You need to go to the Search, reports and Alerts menu of the application (TWv2). The Watch Searches are called [[The Watch] Notable event found ! (Artifact Type) 24/7]. 

The idea is to desactivate all the standard searches (i.e. [[The Watch] Notable event found ! (Mails) 24/7] ) and activate the two other searches set up by artifacts: 

[[The Watch] Notable event found ! (Mails)]
[[The Watch] Notable event found ! (Mails) Optimized]
