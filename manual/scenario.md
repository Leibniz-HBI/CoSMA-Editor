# CoSMA-Editor Political Groups Scenario
This document is a step by step walkthrough on a common usage of *CoSMA-Editor*.
It will demonstrate the upload, review and update of a list containing social media accounts of political groups from Germany.
The data is part of [DBoeS](https://doi.org/10.17605/OSF.IO/SK6T5) and includes parties and parliamentary groups.

The following steps assume that you have [setup](/setup/readme.md) *CoSMA-Editor*
For more details on the presented steps, check the [manual](Readme.md).

# Creating a User Account
After you have logged in with your initial account, click on the profile icon in the top right and select **Manage**.
There go to **Create User** and fill out the form.
Then go to **User Permissions**, select the new user and grant *Contributor* permissions.
For more details checkout the [CoSMA-Editor admin manual](management.md)
> **_Note:_** in the following you sometimes have to switch between the initial user and the newly created user in order to assume different roles.


# Initial Contribution
In the first step a bulk import of the data is performed.
## Obtaining the Data
[Download](https://github.com/Leibniz-HBI/DBoeS-data/raw/refs/heads/main/data/9.csv) the data.
## Upload
Logout of the initial account via the profile icon and login to the newly created account.
On the login you need to set a new password and setup MFA.
Go to the **Contribute** section of  *CoSMA-Editor*.
Click on **Upload CSV**.
Fill in the following details:
* Name: Political Groups
* Select the file from your computer.
* File has header row: tick the checkbox
* Append `,existiert nicht` to the empty values
* Select the `Default Edit Session`
* Click on **Submit**
## Assign Columns Step
In this step new columns are created and afterwards columns from the uploaded CSV file are assigned to the newly created columns.
### Create Columns
First you will need to create the columns.
They will be arranged in a hierarchy of a parent node and two children.
1) Click on **Create New Column**
2) Fill in `Twitter/X` as **name** and select **Navigation** as **type**.
3) Click on **Create**
4) Fill `URL` as **name** select **string** as **type** and select **Twitter/X** as parent.
5) Click on **Create**
6) Fill `ID` as **name** select **string** as **type** and select **Twitter/X** as parent.
7) Click on **Create**
8) Close the Column Create Window

### Assign Columns
Now you need to assign the columns from the upload to the newly created columns in the database.
1) Select `SM_XURL` from the left pane.
2) Expand the `Twitter` hierarchy node in the center pane.
3) Select the `URL` column in the center pane.
4) Select `SM_XID` from the left pane.
5) Select the `ID` column in the center pane.
6) Select the `Name` column from the left pane.
7) Select the `Display Text` column from the center pane.
8) Click on **Finalize Column Assignment**.

## Match Entities Step
Now you need to match rows from your upload to entities in the database.
This is easy, as the database is still empty.
1) Select the first entity from the entity list on the left.
2) After the table on the right has loaded click on **Create New Entity**.
3) In the appearing dialog type a justification like `Entity relevant for my research project`.
4) Select the **Use justification for all entities** checkbox.
5) Click on **Submit** button.
6) Click on **Next with conflicts**
7) Confirm your entity assignment by clicking on **Confirm Assigned Duplicates**.

# View and Curate Uploaded Data
In the following the initial user (having *Commissioner* permissions) will have a look at the data and decide that it should be part of the centrally curated collection.
1) Logout via the profile icon
2) Login with the initial user
3) Go to the **View** section of *CoSMA-Editor*.
4) Click on the Plus icon in the upper right corner of the table.
5) In the *column explorer* click on the eye icon next to **Twitter/X -> URL** and **Twitter/X -> ID**
6) Close the column explorer
7) For both the **URL** and the **ID** column click on the triangle that appears when you hover the mouse over the column header and select **Curate Column**

# Download and Edit
Now the user will download the data and make some changes
1) Login with the user you previously created.
2) Show the *column explorer* by clicking on the plus icon in the upper right corner of the table
3) Click the eye icon next to **Twitter/X** and close the column explorer.
4) Click on **Download**
5) Open the downloaded file
6) Using a compatible editor, change some values in the last two columns.


# Reupload the data
The user will now reupload the data.
The process is similar to the first upload but we do not need to create new columns.
Instead we will assign another column for easier matching.
## Upload
Logout of the initial account via the profile icon and login to the newly created account.
On the login you need to set a new password and setup MFA.
Go to the **Contribute** section of  *CoSMA-Editor*.
Click on **Upload CSV**.
Fill in the following details:
* Name: Political Groups Changed
* Select the file from your computer.
* File has header row: tick the checkbox
* Append `,existiert nicht` to the empty values
* Select the `Default Edit Session`
* Click on **Submit**
## Assign Columns Step
Now you need to assign the columns from the upload to the newly created columns in the database.
1) Select `URL` from the left pane.
2) Expand the `Twitter` hierarchy node in the center pane.
3) Select the `URL` column in the center pane.
4) Select `ID` from the left pane.
5) Select the `ID` column in the center pane.
6) Select the `display_txt` column from the left pane.
7) Select the `Display Text` column from the center pane.
8) Select the `id_entity_persistent` column from the left pane.
9) Select the `Persistent Entity Id` from the center pane.
10) Click on **Finalize Column Assignment**.

## Match Entities Step
As we assigned the persistent id in the last step it is not necessary to match entities.
Click on **Confirm Assigned Duplicates**.

# Review changes
Now the *Commissioner* account will review the proposed changes.
1) Logout via the profile icon
2) Login to the initial account
3) Go to the **Review** section of *CoSMA-Editor*.
   You will see two merge requests assigned to you, one for each column.
   The changes for each column have to be reviewed separately.
## Review a merge request
We will now review the changes.
1) Click on a merge request
2) You will see the **Discuss** tab of the merge request.
   Here you can exchange messages with the user who proposed the changes.
3) Go to the **Resolve** tab.
4) For each conflict decide whether to accept the proposed changes or keep the old value.
   If neither is correct you can also provide a third value.
5) To close the merge request click on **Apply Resolutions to Destination**.
6) Reload the browser and go to the **View** section of *CoSMA-Editor*.
   The changes are now applied.
