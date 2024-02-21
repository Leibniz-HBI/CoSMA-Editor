export function getHelpFromPathSegments(path: string[]): string | undefined {
    let map = helpMap
    let nextMap = helpMap
    for (const pathPart of path) {
        if (typeof map === 'string') {
            break
        }
        nextMap = map[pathPart]
        if (nextMap === undefined) {
            nextMap = map[variableKey]
            if (nextMap === undefined) {
                return nextMap
            }
        }
        map = nextMap
    }
    if (typeof map === 'object') {
        map = map['']
    }
    return map.toString()
}

type HelpMap =
    | string
    | { [key: string]: { [key: string]: HelpMap } }
    | { [key: string]: HelpMap }

const variableKey = 'VARIABLE'

const helpMap: HelpMap = {
    '': {
        '': `# View Data
## About
This is the landing page of **CoSMA-Editor**. The following will explain the possible action that can be performed on this page.
There is the menu that is available on all pages and a table view that lets you view and curate data tailored to your needs.

## Menu
### View
This will bring you back to the table view.
### Contribute
Contribute new data to the trustee and view existing contributions.
### Review
Review proposed changes to the data kept in the trustee.
### Tags
Keep track of tag ownership requests you are involved in.
### Logout
Sign out of the trustee.
### Manage _(Requires Elevated Permissions)_
Control various aspect of the trustee.
## Table View
Here you can view the currently selected data.
Each row represent an entity and a column represents a tag.
### Show Additional data
By clicking the plus icon at the top right of the table a popup will open from where you can select additional tags to display.
### Add Entity
Add a new entity to the trustee
### Merge Entities
First, select exactly two entities by clicking the check box at the beginning of the row.
By clicking the **Merge Entities** a request for merging the entities will be created
### Search
Search the selected data for a specific value
### Download
Locally store a copy of the currently selected data as a \`.csv\` file.`,
        contribute: {
            '': `# Contribute
Here you can add data to the trustee by clicking the *Upload CSV* button or come back to previously uploaded contributions by clicking the corresponding entry in the list of contributions.`,
            [variableKey]: {
                metadata: `# Edit Metadata
Change metadata of the selected contribution.
Click the **Edit** button to save the changes.`,
                columns: `# Assign Columns
Here you can assign the columns of a \`csv\` upload to new or existing tags in the trustee.
## List of columns
On the left you see a list containing all columns from your \`csv\` file.
If you want to deselect a previously assigned column, disable the toggle in the corresponding list entry.
Click an entry to select a column for assignment.
## Assignment View
In the center you will find the list of existing tags.
To assign the selected column to an existing tag click the radio button on the right of a tag entry.
If you want to create a new tag click on **Create new tag**
## Preview
In the future you will be able to compare data from the selected column and the assigned tag.
## Completing the Assignment
When you have assigned all the columns you want to contribute, click on **Finalize Column Assignment** to  proceed to the next step.`,
                entities: `# Match Entities
Please assign the rows of your uploaded \`csv\` to existing entities wherever possible.
### Note
This view is not intended for correcting values.
## Entity List
On the left you find a list of all entities, i.e., rows, found in the contributed \`csv\` file.
Select an entry to view and assign matches found in the trustee.
It is best to start with the first list entry.
## Match view
To the right of the entity list you find the match view table.
### Columns
* The first column shows explanations for the values in the given row.
* In the second column is the entity uploaded by you.
* The remaining columns represent found matches
### Rows
* The first row contains buttons to decide whether there is an existing entity in the trustee matching the entity in the contribution or not.
  * Selecting **Create New Entity** will indicate that none of the proposed matches, match the selected entity of your contribution.
  * By clicking on **Assign Duplicate** you indicate that the selected entity of the contribution matches the existing entity of the column.
  * Either choice will advance to the next contributed entity for which matches were found.
* The second row shows the similarity between _display texts_ of the contributed and existing entities. It is blank for the contributed entity.
* The third row show how many tags have an exact match for the contributed and existing entities. It is also blank for the contributed entity.
* The fourth row show the _display text_ of the entities.
* All remaining rows show tag values to aid in the comparison of contributed and matched entities. Exact matches of tag values are highlighted.
### Showing Additional Values
To further assist in comparing the contributed entity with existing ones in the trustee you can select additional tags by clicking on **Show Additional Tag Values**.
### Completing Entity Matching
When you are confident, that all contributed entities are matched to existing ones or are marked as having no match in the trustee, click on **Confirm Assigned Duplicates**.

                `
            }
        },
        review: {
            '': `# Review
Here you see the merge requests relevant to you.
Select a merge request to see the current progress and decide value conflicts.
## Tag Merge Requests
On the left you see entity merge requests.
The top box contains merge requests assigned to you.
Below are merge requests created by you.
## Entity Merge Requests
To the right are entity merge requests relevant to you.`,
            tags: {
                [variableKey]: `# Tag Merge Request
This page contains all value conflicts between origin and destination tags.
If the data for one or more conflicts has changed since you last made a decision,
there will be a box at the top of the page querying you resolve the conflicts again.
Below is a list of all conflicts.
## Deciding conflicts
For each conflict you have to decide wether to keep the value in the destination tag or overwriting it with the value from the origin tag.
## Applying resolutions
When all conflicts are resolved, click on **Apply Resolutions to Destination** apply the resolutions to the destination tag.
`
            },
            entities: {
                [variableKey]: `# Entity Merge Request
This page contains all value conflicts between origin and destination entity.
If values have changed, since you last resolved conflicts they are shown in the top box.
Below is the list of all conflicts you can resolve.
On the bottom is the list of conflicts you can not resolve.
## Applying Resolutions
Click the **Apply Resolutions to Destination** button to apply the resolutions for conflicts you can resolve.
For conflicts you can not resolve, a tag merge request is created.
## Switching Origin and Destination
By clicking on **Reverse Direction** the origin entity of the merge request becomes the destination and vice versa.`
            }
        },
        tags: {
            '': `# Tag Ownership Request
Here you see the tag ownership transfer requests you are involved in.
* On top are the transfer requests where you are petitioned to accept ownership
  * You can accept or ignore the requests.
* Below are the transfer requests where you requested another user to take over ownership.
  * You can withdraw the requests.`
        },
        management: {
            '': `# Management
This section of the trustee gives you access to different configuration settings that control how this instance of the trustee works.
## User Permissions
Assign privileges to users or withdraw them.
## Display Text Order
Control the order of fallback tags for entities without a display text.`,
            user: {
                '': `# User Permissions
Assign permission groups to users.
## User list
Click on a user from the list on the left to select them for permission assignment.
## Permission Assignment
After selecting a user you can assign a permission level to them.`
            },
            'display-txt': {
                '': `# Display Text Order
This page allows you to control the way a display text, i.e., human readable label, is assigned to entities where no display text is assigned.
## List of Fallback Tags for Display Text
When an entity has no display text, the trustee tries the values of the shown tags with decreasing priority from top to bottom.
If a value is found for the given tag, the value is used as display text.
Otherwise the next tag is tried.
If no tag has a value for the given entity its persistent id is used as display text.
### Removing a Tag from the Order
By clicking the cross on the right of an entry, the corresponding tag is removed from the display text fallback order.
## Tag Explorer
On the right is a tag explorer.
By clicking on the plus symbol of an entry, the corresponding tag is appended to the display text fallback order.`
            }
        }
    }
}
