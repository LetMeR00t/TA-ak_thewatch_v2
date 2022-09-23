# The Watch Init process
## Fill all lookups

### Qualification sets
- id:  5431946355d5e62359f47290f8143955f93ba511
name: default
description: This is the default set of qualifications for The Watch

```spl
| inputlookup thewatch_qualification_sets
| append 
[| makeresults
| eval id="5431946355d5e62359f47290f8143955f93ba511", name="default", description="This is the default set of qualifications for The Watch"]
| table id name description
| outputlookup thewatch_qualification_sets
```

### Qualification labels
__Must be done from GUI__

- priority: 5
name: FALSE POSITIVE
description: This is the qualification for any FALSE POSITIVE event
color: blue
score: 0
membership: default

- priority: 1
name: TRUE POSITIVE
description: This is the qualification for any TRUE POSITIVE event
color: red
score: 5
membership: default

- priority: 3
name: SUSPICIOUS
description: This is the qualification for any SUSPICIOUS event
color: purple
score: 3
membership: default

- priority: 7
name: CLEAN
description: This is the qualification for any CLEAN event
color: green
score: 0
membership: default

### Tags
__Must be done from GUI__

- type: Team
name: SOC
default_score: 1
qualification_set : default

### Severity levels
__Must be done from GUI__

- low: 2
medium: 4
high: 8

- low: 20
medium: 40
high: 80
