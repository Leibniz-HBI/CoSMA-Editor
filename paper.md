---
title: 'A Collaborative Editor for Social Media Account Lists'
tags:
  - Python
  - social sciences
  - social media research
  - data trustee
authors:
  - surname: Fürneisen
    given-names: Moritz
    orcid: 0009-0003-9257-0616
    affiliation: "1"
  - surname: Rau
    given-names: Jan
    orcid: 0000-0001-7011-5346
    affiliation: "1"
  - surname: Jungmann
    given-names: Nils
    orcid: 0000-0001-8849-8373
    affiliation: "2"
  - surname: Stille
    given-names: Lina
    affiliation: "2"
  - surname: Siegers
    given-names: Pascal
    orcid: 0000-0001-7899-6045
    affiliation: "2"
  - surname: Wiedemann
    given-names: Gregor
    orcid: 0000-0002-4239-295X
    affiliation: "1"
affiliations:
 - name: Media Research Methods Lab, Leibniz-Institute for Media Research | Hans-Bredow-Institute (HBI), Germany
   index: 1
 - name: Survey Data Curation, GESIS Leibniz-Institute for the Social Sciences, Germany
   index: 2
date: 29 May 2026
bibliography: paper.bib
---
# Summary
Data sharing poses a major challenge for digital media and communication research, particularly in sensitive areas such as online studies on extremism.
The _Collaborative Social Media Account Editor_ is aimed at fostering collaboration and the sharing of research data, such as digital account lists.
Compiling these lists is a critical yet labor-intensive step in many research projects; sharing them could significantly reduce effort and improve data quality.

# Statement of need
Digital research in media, communication, and the social sciences frequently relies on curated lists of online actors, accounts, and websites as the basis for data collection and analysis. Studies of political communication, disinformation, social movements, or online extremism commonly begin with account-based sampling, in which researchers first identify relevant entities before collecting posts, networks, or interaction traces [@wiedemann2023concept; @jost2023mapping]. Constructing and maintaining such lists is methodologically essential but highly labor-intensive. Online environments are volatile: accounts change identifiers, migrate across platforms, or disappear through moderation and deplatforming [@rogers2020deplatforming]. Consequently, research teams repeatedly duplicate the same curation work in isolated spreadsheets or project-specific databases, leading to fragmented datasets, inconsistent classifications, and limited reproducibility [@sen2021total; @weller2016manifesto].
These challenges are amplified when account lists contain personal or politically sensitive information, as is common in research on extremism, hate speech, or misinformation. Ethical guidelines, data protection regulations, and legal uncertainty often restrict straightforward sharing or publication of such data [@franzke2020internet; @akdeniz2023sharing; @kreutzer2024wissenschaftliche]. General-purpose tools such as spreadsheets or standard database systems provide little support for controlled access, provenance tracking, collaborative validation, or auditability. As a result, many teams lack dedicated infrastructure that enables secure, transparent, and cooperative curation of sensitive actor directories.
CoSMAE addresses this gap by providing an open-source, web-based software platform for the structured, collaborative management of account lists and related metadata. The software supports entity-centered data modeling, versioning, authorship tracking, fine-grained permissions, audit logs, bulk import/export, duplicate detection, and justification fields that document inclusion decisions. These features enable multiple researchers to jointly maintain evolving directories while preserving data provenance and accountability. By centralizing updates and enabling peer review of records, CoSMAE improves data quality, reduces redundant effort, and facilitates reproducible workflows. The system is particularly suited to environments where sensitive data must be shared under controlled conditions.
Although CoSMAE was initially developed to support far-right online research, the software is domain-agnostic and multipurpose. It can support any research team that curates dynamic actor or account lists, including projects in political communication, public discourse monitoring, misinformation studies, or digital observatories. More broadly, it contributes reusable infrastructure aligned with calls for sustainable research software and shared data governance in computational social science [@lazer2020computational; @strippel2021forschungsinfrastrukturen; @delacroix2019bottom].
By transforming account list maintenance from ad -hoc, project-specific workflows into a structured, collaborative, and auditable process, CoSMAE provides the technical foundation for scalable and compliant digital research data curation.

# State of the field
So far, account list management in the context of digital research in media, communication, and the social sciences often relies on spreadsheets (potentially synchronized spreadsheets). While these solutions are somewhat functional for one time data collections for individual researchers or smaller teams of researchers, they are not able to meaningfully integrate the scope, complexity and volatility of large scale and long term over time monitoring of complex social phenomena as well as enable the required collaboration effort of many researchers and research teams to conduct such work (including important functionalities of complex collaborations such as quality control, attribution and others). This gap of appropriate and meaningful technology is one of the main motivations behind the development of CoSMAE. We are not aware of any other software facilitating structured, collaborative management of account lists and related metadata in the way CoSMAE does.

# Software Design
The main features of the Software are the data curation, data history and author credits. Requirements and different options for solutions where developed and discussed in a series of co-creation workshops with target users from academia from different German research institutes in the years 2024 and 2025.
To ensure data quality, the software provides a data curation workflow. Users upload CSV files and then match the columns of their data to columns in the database. Using the provided column matching rows of the CSV are matched to entities in the database. The user confirms the matching or chooses to create a new entity. Combined, the two steps link a cell in the CSV to an entry in the database. This link is considered a suggestion for changes to the database. A curator reviews the suggestions as ‘merge requests’ between columns.
The data history is important to track a dynamic field and enables reproducible research design. The data history is implemented by adding timestamps to all edits and keeping references to previous versions of a data entry. A different possibility would be to manage references to the next edit. But this would mean that an edit would not only create a new entry but would also need to edit an existing entry. The chosen copy-on write mechanism allows easier writes and limits the ancestor tree to two entries. One for a direct edit and another for an edit due to a column merge.
Author credits are tracked to create visibility for contributions to the database. Based on community feedback, it was decided that all types of edits (changes, additions, deletion) should be considered to have equal value, as the work for verifying the change varies across cases and that the effort is not correlated by the type of edit. While the data model would allow to track changes across column merges , this is currently not done. Tracking author credits across merges would require complex bookkeeping to prevent double counting. Author credits can be the basis for, for instance, a “wall of fame” for contributors on a project page, or an ordered author list of versioned releases of the database

# AI Usage Disclosure
Since Development of CoSMA-Editor began, various AI tools have been released. Some of them have been tested during development. ChatGPT has been used for less than 50 problems, e.g. regarding specific libraries. The extended auto complete feature of VS Code powered by Copilot has also been tried. The quality of suggestions made was mixed and always needed human verification.

# Research Impact
CoSMA-Editor is intended as research infrastructure for data sharing, with the goal to assist reproducibility and future research. Therefore, the importance of the software is not measured by the number of publications but by the data it provides. Currently, the software is used by a community of right-wing extremism researchers.
Contributions from four research projects amount to information on several thousand accounts.
There is a german language article on the concept of data trustee for social media account lists[@jungmann2025community],
as well as an upcoming english language article accepted for publication in a Media and Communication issue on _Open Research Infrastructures and Resources for Communication and Media Studies_.
Earlier versions of the the latter have been presented at ICA [@rau2025sharing] and Social Media & Society [@rau2024sharing].

# Acknowledgements

## Community Input
The features of *CoSMA-Editor* where suggested and refined in multiple co-creation workshops.
Without the input from those meetings, development would not have been possible.

## Funding
The CoSMA-Editor is funded by the German Federal Ministry of Education and Reasearch under grant numbers 01UG2151A-D, 16DTM208A&B and 16DTM404A-E

# References
