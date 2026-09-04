# Management of CoSMA-Editor
This document describes how *CoSMA-Editor* can be configured to suit you community.
Apart from curating columns the management options can be accessed by clicking on the profile icon and selecting **Manage**.
## Curated Columns
*Curated columns* contain data that is reviewed by the Trustee maintainers.
When a column is curated, all users with permission level *editor* or *commissioner* can review merge requests for that column.
### Curating Columns
In order to curate a column you have to enable it in the **View** section of *CoSMA-Editor* and possess *editor* or *commissioner* permissions.
After clicking on the triangle in the header of the column, select **Curate Column*.
This will mark the column as curated.
### Remove curation status
You can remove the curation flag by transferring ownership to a user.
*Hint:* If you create an ownership request for you own account, the ownership will be transferred without confirmation.

## Create User
Here you can create a new user.
The following details are required.
* a username
* the personal names of the user
* optionally you can provide the family names of the user.
* a valid email address, this is required for account confirmation
* an initial password, the user will need to change it after first login.
* a public SSH-key provided by the user.

You will get a confirmation message when the new user was created successfully.
Afterwards you should set the correct permission level for the user.
The user will have to assign a different password after signing in for the first time.
## User Permissions
Here you can set the permissions for users.
There are five permission levels, each with different privileges.
In the following overview each permission level retains the privileges from the levels listed before it.
* *Applicant* legacy permission level that is not used anymore.
* *Reader* can view data
* *Contributor* can upload data and edit data in user columns belonging to their account
* *Editor* can review merge requests for curated columns
* *Commissioner* can manage the *CoSMA-Editor* instance and curate columns.

To assign a permission you have to first select the pertaining user from the list of users.

## Password
Here you can set a password for user who have forgotten theirs.
To reset a password search a user from the text field.
Then type the new password and confirm it.
The user will have to assign a different password after signing in for the first time.

## Multi-Factor
Here you can delete the multi factor authentication for a user

## SSH-Key
Set a SSH key for a user.


## Display Text
To easily tell entities should have a *display text*.
However it may not always possibly to assign a clear label.
In this section you can assign a list of fallback labels taken from the list of curated columns.
The resulting list will provide the order of fallback options with decreasing priority.
### Add a Column as Fallback
To add a column as fallback for the display text, navigate to its entry in the column explorer and click on the ➕ symbol.
### Remove a Column as Fallback
To remove a column as display text fallback option click on ✖.

## Data Publication
Here you can create a `JSON` format file containing statistic on authorship and column details.
First you need to assign a name for the data publication.
Then you need to select the time range considered in the statistics.
The start date can be left empty and the end date is the current day by default.
When the processing is completed, you can use the **Download** button to retrieve the computed data.
