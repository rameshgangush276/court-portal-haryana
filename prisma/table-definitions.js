// ─── AUTO-GENERATED: Single Source of Truth for Table Definitions ───────────
// This file is automatically updated whenever a table or column is modified
// via the Developer Dashboard. Do NOT edit manually.
// To make structural changes: use the Manage Data Entry Tables UI.

module.exports = [
    {
        "name": "1. List of trials disposed/completed today",
        "slug": "trials-disposed",
        "description": "List of trials disposed/completed today",
        "singleRow": false,
        "sortOrder": 1,
        "columns": [
            {
                "name": "FIR Number",
                "slug": "fir_no",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 0
            },
            {
                "name": "FIR Year",
                "slug": "fir_year",
                "dataType": "year",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 1
            },
            {
                "name": "Sections (U/s)",
                "slug": "sections",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 2
            },
            {
                "name": "Police Station",
                "slug": "police_station",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 3
            },
            {
                "name": "Name of Accused",
                "slug": "accused_name",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 4
            }
        ]
    },
    {
        "name": "2. Decision on Cancellation/Untraced Files",
        "slug": "cancellation-decisions",
        "description": "Decision on Cancellation/Untraced Files",
        "singleRow": false,
        "sortOrder": 2,
        "columns": [
            {
                "name": "FIR Number",
                "slug": "fir_no",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 0
            },
            {
                "name": "FIR Year",
                "slug": "fir_year",
                "dataType": "year",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 1
            },
            {
                "name": "Sections (U/s)",
                "slug": "sections",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 2
            },
            {
                "name": "Police Station",
                "slug": "police_station",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 3
            },
            {
                "name": "Decision",
                "slug": "decision",
                "dataType": "enum",
                "enumOptions": [
                    "Accept",
                    "Further investigation",
                    "Take cognizance",
                    "Take protest petition and proceed as complaint"
                ],
                "isRequired": true,
                "sortOrder": 4
            }
        ]
    },
    {
        "name": "3. Decision on any application filed by police officials",
        "slug": "police-applications",
        "description": "Decision on any application filed by police officials",
        "singleRow": false,
        "sortOrder": 3,
        "columns": [
            {
                "name": "Application Type",
                "slug": "application_type",
                "dataType": "enum",
                "enumOptions": [
                    "Case Property Disposal",
                    "Bail Cancellation",
                    "Other"
                ],
                "isRequired": true,
                "sortOrder": 0
            },
            {
                "name": "Date of Application",
                "slug": "application_date",
                "dataType": "date",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 1
            },
            {
                "name": "Decision",
                "slug": "decision",
                "dataType": "enum",
                "enumOptions": [
                    "Allowed",
                    "Dismissed",
                    "Abated"
                ],
                "isRequired": true,
                "sortOrder": 2
            },
            {
                "name": "Reasons for Dismissal",
                "slug": "dismissal_reasons",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": false,
                "sortOrder": 3
            },
            {
                "name": "Remarks",
                "slug": "remarks",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": false,
                "sortOrder": 4
            }
        ]
    },
    {
        "name": "4. List of accused whose bail bonds were furnished after grant of bail",
        "slug": "bail-granted",
        "description": "List of accused granted bail (along with surety/identifier, photos etc.)",
        "singleRow": false,
        "sortOrder": 4,
        "columns": [
            {
                "name": "Name of Accused",
                "slug": "accused_name",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 0
            },
            {
                "name": "FIR Number",
                "slug": "fir_no",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 1
            },
            {
                "name": "FIR Year",
                "slug": "fir_year",
                "dataType": "year",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 2
            },
            {
                "name": "Sections (U/s)",
                "slug": "sections",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 3
            },
            {
                "name": "Police Station",
                "slug": "police_station",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 4
            },
            {
                "name": "Bail Type",
                "slug": "bail_type",
                "dataType": "enum",
                "enumOptions": [
                    "Regular Bail",
                    "Interim Bail",
                    "Anticipatory Bail"
                ],
                "isRequired": true,
                "sortOrder": 5
            },
            {
                "name": "Name of Surety",
                "slug": "surety_name",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 6
            },
            {
                "name": "Name of Identifier",
                "slug": "identifier_name",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 7
            },
            {
                "name": "Father's Name of Surety",
                "slug": "surety_father_name",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": false,
                "sortOrder": 8
            },
            {
                "name": "Address of Surety",
                "slug": "surety_address",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": false,
                "sortOrder": 9
            },
            {
                "name": "Mobile No. of Surety",
                "slug": "surety_mobile",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": false,
                "sortOrder": 10
            },
            {
                "name": "Mobile No. of Identifier",
                "slug": "identifier_mobile",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": false,
                "sortOrder": 11
            },
            {
                "name": "Photo Taken",
                "slug": "photo_taken",
                "dataType": "enum",
                "enumOptions": [
                    "Yes",
                    "No"
                ],
                "isRequired": true,
                "sortOrder": 12
            }
        ]
    },
    {
        "name": "5. List of declared POs/PPs/BJs",
        "slug": "po-pp-bj",
        "description": "List of declared POs/PPs/BJs",
        "singleRow": false,
        "sortOrder": 5,
        "columns": [
            {
                "name": "Name of Accused",
                "slug": "accused_name",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 0
            },
            {
                "name": "FIR Number",
                "slug": "fir_no",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 1
            },
            {
                "name": "FIR Year",
                "slug": "fir_year",
                "dataType": "year",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 2
            },
            {
                "name": "Sections (U/s)",
                "slug": "sections",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 3
            },
            {
                "name": "Police Station",
                "slug": "police_station",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 4
            },
            {
                "name": "Declaration Type",
                "slug": "declaration_type",
                "dataType": "enum",
                "enumOptions": [
                    "PO",
                    "PP",
                    "BJ"
                ],
                "isRequired": true,
                "sortOrder": 5
            }
        ]
    },
    {
        "name": "6. Value of Property attached (85 BNSS & 107 BNSS)",
        "slug": "property-attached",
        "description": "Detail of Property attached (85 BNSS & 107 BNSS)",
        "singleRow": false,
        "sortOrder": 6,
        "columns": [
            {
                "name": "Name of Accused",
                "slug": "accused_name",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 0
            },
            {
                "name": "FIR Number",
                "slug": "fir_no",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 1
            },
            {
                "name": "FIR Year",
                "slug": "fir_year",
                "dataType": "year",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 2
            },
            {
                "name": "Sections (U/s)",
                "slug": "sections",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 3
            },
            {
                "name": "Police Station",
                "slug": "police_station",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 4
            },
            {
                "name": "BNSS Section",
                "slug": "bnss_section",
                "dataType": "enum",
                "enumOptions": [
                    "85 BNSS",
                    "107 BNSS"
                ],
                "isRequired": true,
                "sortOrder": 5
            },
            {
                "name": "Property Details",
                "slug": "property_details",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 6
            },
            {
                "name": "Property Value",
                "slug": "property_value",
                "dataType": "number",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 7
            }
        ]
    },
    {
        "name": "7. Applications/Complaints/Istgasa filed against Police Officials",
        "slug": "complaints-against-police",
        "description": "Applications/Complaints/Istgasa filed against Police Officials",
        "singleRow": false,
        "sortOrder": 7,
        "columns": [
            {
                "name": "Details of Applicant",
                "slug": "applicant_details",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 0
            },
            {
                "name": "Brief Facts",
                "slug": "brief_facts",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 1
            },
            {
                "name": "Next Hearing Date",
                "slug": "next_hearing_date",
                "dataType": "date",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 2
            }
        ]
    },
    {
        "name": "8. FIR Registration under 156(3) CrPC",
        "slug": "fir-156-3",
        "description": "FIR Registration under 156(3) CrPC",
        "singleRow": false,
        "sortOrder": 8,
        "columns": [
            {
                "name": "Details of Applicant",
                "slug": "applicant_details",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 0
            },
            {
                "name": "Sections in Complaint",
                "slug": "complaint_sections",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 1
            },
            {
                "name": "Police Station",
                "slug": "police_station",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 2
            },
            {
                "name": "Details of Police Officials",
                "slug": "police_official_details",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 3
            }
        ]
    },
    {
        "name": "9. List of SHOs and DSPs who appeared in court today (for deposition or other matter)",
        "slug": "sho-dsp-appeared",
        "description": "List of SHOs and DSPs who appeared in court today",
        "singleRow": false,
        "sortOrder": 9,
        "columns": [
            {
                "name": "Name of SHO/ DSP",
                "slug": "officer_name",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 0
            },
            {
                "name": "Rank",
                "slug": "rank",
                "dataType": "enum",
                "enumOptions": [
                    "SHO",
                    "DSP/ASP/Addl SP"
                ],
                "isRequired": true,
                "sortOrder": 1
            },
            {
                "name": "Place of Posting",
                "slug": "posting_place",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 2
            },
            {
                "name": "Reason",
                "slug": "reason",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 3
            },
            {
                "name": "Remarks",
                "slug": "remarks",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": false,
                "sortOrder": 4
            }
        ]
    },
    {
        "name": "10. Deposition of police officials",
        "slug": "police-deposition",
        "description": "Deposition of police officials — aggregate counts per court per day",
        "singleRow": true,
        "sortOrder": 10,
        "columns": [
            {
                "name": "Supposed to Appear",
                "slug": "supposed_to_appear",
                "dataType": "number",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 0
            },
            {
                "name": "Appeared Physically",
                "slug": "appeared_physically",
                "dataType": "number",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 1
            },
            {
                "name": "Examined Physically",
                "slug": "examined_physically",
                "dataType": "number",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 2
            },
            {
                "name": "Examined via VC",
                "slug": "examined_via_vc",
                "dataType": "number",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 3
            },
            {
                "name": "Absent (Unauthorized/No Request)",
                "slug": "absent_unauthorized",
                "dataType": "number",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 4
            }
        ]
    },
    {
        "name": "11. VC of prisoners",
        "slug": "vc-prisoners",
        "description": "VC of prisoners — aggregate counts per court per day",
        "singleRow": true,
        "sortOrder": 11,
        "columns": [
            {
                "name": "Produced Physically",
                "slug": "produced_physically",
                "dataType": "number",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 0
            },
            {
                "name": "Produced via VC",
                "slug": "produced_via_vc",
                "dataType": "number",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 1
            }
        ]
    },
    {
        "name": "12. Test Identification Parade of accused persons conducted today",
        "slug": "tips-conducted",
        "description": "TIPs conducted today",
        "singleRow": false,
        "sortOrder": 12,
        "columns": [
            {
                "name": "FIR Number",
                "slug": "fir_no",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 0
            },
            {
                "name": "FIR Year",
                "slug": "fir_year",
                "dataType": "year",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 1
            },
            {
                "name": "Sections (U/s)",
                "slug": "sections",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 2
            },
            {
                "name": "Police Station",
                "slug": "police_station",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 3
            }
        ]
    },
    {
        "name": "13. Pairvi for private witness",
        "slug": "pairvi-witness",
        "description": "Pairvi for private witness — aggregate counts per court per day",
        "singleRow": true,
        "sortOrder": 13,
        "columns": [
            {
                "name": "Witnesses Examined",
                "slug": "witnesses_examined",
                "dataType": "number",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 0
            },
            {
                "name": "Witness prepared out of witness examined",
                "slug": "witnesses_prepared",
                "dataType": "number",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 1
            }
        ]
    },
    {
        "name": "14. Any Gangster/Notorious Criminal appearing in Court the next day",
        "slug": "gangster-next-day",
        "description": "Any Gangster/Notorious Criminal appearing in Court the next day",
        "singleRow": false,
        "sortOrder": 14,
        "columns": [
            {
                "name": "Gangster & Gang Details",
                "slug": "gangster_details",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 0
            },
            {
                "name": "FIR Number",
                "slug": "fir_no",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 1
            },
            {
                "name": "FIR Year",
                "slug": "fir_year",
                "dataType": "year",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 2
            },
            {
                "name": "Sections (U/s)",
                "slug": "sections",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 3
            },
            {
                "name": "Police Station",
                "slug": "police_station",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 4
            },
            {
                "name": "Accused Status",
                "slug": "accused_status",
                "dataType": "enum",
                "enumOptions": [
                    "Bail",
                    "Judicial Custody"
                ],
                "isRequired": true,
                "sortOrder": 5
            },
            {
                "name": "Name of Jail",
                "slug": "jail_name",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": false,
                "sortOrder": 6
            }
        ]
    },
    {
        "name": "15. Any Crime against Property offender appearing in court the next day",
        "slug": "property-offender-next-day",
        "description": "Any Crime against Property offender appearing in court the next day",
        "singleRow": false,
        "sortOrder": 15,
        "columns": [
            {
                "name": "Details of Accused",
                "slug": "accused_details",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 0
            },
            {
                "name": "FIR Number",
                "slug": "fir_no",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 1
            },
            {
                "name": "FIR Year",
                "slug": "fir_year",
                "dataType": "year",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 2
            },
            {
                "name": "Sections (U/s)",
                "slug": "sections",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 3
            },
            {
                "name": "Police Station",
                "slug": "police_station",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 4
            },
            {
                "name": "Accused Status",
                "slug": "accused_status",
                "dataType": "enum",
                "enumOptions": [
                    "Bail",
                    "Judicial Custody"
                ],
                "isRequired": true,
                "sortOrder": 5
            },
            {
                "name": "Name of Jail",
                "slug": "jail_name",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": false,
                "sortOrder": 6
            }
        ]
    },
    {
        "name": "16. Fresh Bail Applications listed for tomorrow",
        "slug": "bail-applications-tomorrow",
        "description": "Bail Applications listed for tomorrow",
        "singleRow": false,
        "sortOrder": 16,
        "columns": [
            {
                "name": "Name of Accused",
                "slug": "accused_name",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 0
            },
            {
                "name": "FIR Number",
                "slug": "fir_no",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 1
            },
            {
                "name": "FIR Year",
                "slug": "fir_year",
                "dataType": "year",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 2
            },
            {
                "name": "Sections (U/s)",
                "slug": "sections",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 3
            },
            {
                "name": "Police Station",
                "slug": "police_station",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 4
            },
            {
                "name": "Bail Type",
                "slug": "bail_type",
                "dataType": "enum",
                "enumOptions": [
                    "Regular Bail",
                    "Anticipatory Bail"
                ],
                "isRequired": true,
                "sortOrder": 5
            }
        ]
    },
    {
        "name": "17. NBW Arrest Warrants issued today",
        "slug": "nbw-arrest-warrants",
        "description": "NBW Arrest Warrants issued today",
        "singleRow": false,
        "sortOrder": 17,
        "columns": [
            {
                "name": "Name of Accused",
                "slug": "accused_name",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 0
            },
            {
                "name": "FIR Number",
                "slug": "fir_no",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 1
            },
            {
                "name": "FIR Year",
                "slug": "fir_year",
                "dataType": "year",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 2
            },
            {
                "name": "Sections (U/s)",
                "slug": "sections",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 3
            },
            {
                "name": "Police Station",
                "slug": "police_station",
                "dataType": "text",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 4
            },
            {
                "name": "Next Date",
                "slug": "next_date",
                "dataType": "date",
                "enumOptions": null,
                "isRequired": true,
                "sortOrder": 5
            }
        ]
    }
];
