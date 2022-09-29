# First installation
You will have to initialize lookups with some values

## Qualification sets

You have to initialize the default qualification set in order to have at least one set of qualifications available in the application.
To do so, you have to add one entry in the "thewatch_qualification_sets" lookup with those information:
| Field       | Value                                                   |
| ----------- | ------------------------------------------------------- |
| id          | 5431946355d5e62359f47290f8143955f93ba511                |
| name        | default                                                 |
| description | This is the default set of qualifications for The Watch |


This can be done also using an SPL search like this :
```spl
| inputlookup thewatch_qualification_sets
| append 
[| makeresults
| eval id="5431946355d5e62359f47290f8143955f93ba511", name="default", description="This is the default set of qualifications for The Watch"]
| table id name description
| outputlookup thewatch_qualification_sets
```


## Qualification labels
__Must be done from GUI__

Go to the application and select "Manage" > "Manage: Qualifications - Labels"

By using the "Add" mode on this dashboard, fill the inputs with the following values to initialize them:

| Field       | Value                                                  |
| ----------- | ------------------------------------------------------ |
| name        | FALSE POSITIVE                                         |
| description | This is the qualification for any FALSE POSITIVE event |
| membership  | default                                                |
| priority    | 5                                                      |
| color       | blue                                                   |
| score       | 0                                                      |

| Field       | Value                                                 |
| ----------- | ----------------------------------------------------- |
| name        | TRUE POSITIVE                                         |
| description | This is the qualification for any TRUE POSITIVE event |
| membership  | default                                               |
| priority    | 1                                                     |
| color       | red                                                   |
| score       | 5                                                     |

| Field       | Value                                              |
| ----------- | -------------------------------------------------- |
| name        | SUSPICIOUS                                         |
| description | This is the qualification for any SUSPICIOUS event |
| membership  | default                                            |
| priority    | 3                                                  |
| color       | purple                                             |
| score       | 3                                                  |

| Field       | Value                                         |
| ----------- | --------------------------------------------- |
| name        | CLEAN                                         |
| description | This is the qualification for any CLEAN event |
| membership  | default                                       |
| priority    | 7                                             |
| color       | green                                         |
| score       | 0                                             |

You should have this array at the end:

![default_qualification_labels](https://raw.githubusercontent.com/LetMeR00t/TA-ak_thewatch_v2/develop/images/default_qualification_labels.png)

> **_NOTE:_**  This default set can be modified afterwards, it is mainly a matter of having a set of functional labels at the start. On the other hand, it is very advisable to keep the default set (especially because it is selected as the default value for cases)

## Tags
__Must be done from GUI__

Go to the application and select "Manage" > "Manage: Tags"

A tag is used to identify a team or a product. You can imagine to have several teams looking for the same artifact but having different processes to follow.

By using the "Add" mode on this dashboard, fill the inputs with the following values to initialize them:

| Field             | Value   |
| ----------------- | ------- |
| type              | Team    |
| qualification_set | default |
| name              | SOC     |
| default_score     | 1       |

You should have this array at the end:

![default_qualification_labels](https://raw.githubusercontent.com/LetMeR00t/TA-ak_thewatch_v2/develop/images/default_tags.png)

> **_NOTE:_**  This default set can be modified afterwards, it is mainly a matter of having a working tag.
> 
### Severity levels
__Must be done from GUI__

Go to the application and select "Manage" > "Manage: Security Levels"

Security levels are only used for cases with the aggregation mode set to "Alert".

By using the "Add" mode on this dashboard, fill the inputs with the following values to initialize them:

| Field  | Value |
| ------ | ----- |
| low    | 2     |
| medium | 4     |
| high   | 8     |

| Field  | Value |
| ------ | ----- |
| low    | 20    |
| medium | 40    |
| high   | 80    |

![default_severity_levels](https://raw.githubusercontent.com/LetMeR00t/TA-ak_thewatch_v2/develop/images/default_severity_levels.png)
