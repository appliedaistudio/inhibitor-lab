import { Politician } from "@/types/politician";

// Ballotpedia S3 base URL for politician photos
const bp = (filename: string) =>
  `https://s3.amazonaws.com/ballotpedia-api4/files/thumbs/200/300/${filename}`;

// Fallback avatar for politicians without Ballotpedia photos
const avatar = (name: string, bg: string = "0D8ABC") =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=400&background=${bg}&color=fff&bold=true&font-size=0.33`;

export const mockPoliticians: Politician[] = [
  {
    id: "1",
    name: "Cherelle Parker",
    party: "Democrat",
    office: "Mayor of Philadelphia",
    officeLevel: "Local",
    photo: bp("CherelleParker.jpg"),
    bio: "100th Mayor of Philadelphia. First woman elected mayor. Assumed office Jan 1, 2024. Former state representative (District 200, 2005-2016) and city council member (District 9, 2016-2022).",
    positions: [
      { area: "Justice", stance: "Deployed 300 additional officers under 'Project Safe Haven'; shootings down 28% in covered zones (Jan-Sep 2025 vs. same period 2024, PPD CompStat)", recentVote: "Executive Order 2024-03: Project Safe Haven launch", source: "PPD CompStat", sourceUrl: "https://www.phillypolice.com/crime-maps-stats/", date: "2025-09-15" },
      { area: "Economy", stance: "Signed $50M Small Business Acceleration Fund (Ordinance 240312); 1,200 grants disbursed to date averaging $38K each", recentVote: "Signed Ordinance 240312", source: "City of Philadelphia", sourceUrl: "https://www.phila.gov/departments/mayor/", date: "2025-08-22" },
      { area: "Education", stance: "FY2026 budget allocates $42M (+18% YoY) for pre-K expansion, adding 2,400 seats across 35 new sites", source: "FY2026 Budget", sourceUrl: "https://www.phila.gov/departments/office-of-the-director-of-finance/", date: "2025-07-10" }
    ]
  },
  {
    id: "2",
    name: "Nina Ahmad",
    party: "Democrat",
    office: "Philadelphia City Council At-Large",
    officeLevel: "Local",
    photo: bp("Nina_Ahmad.jpg"),
    bio: "City Council member at-large since 2024. Ph.D. from University of Pennsylvania. Former Deputy Mayor for Public Engagement.",
    positions: [
      { area: "Education", stance: "Introduced Resolution 250114 requiring STEM equipment audits in all 216 district schools; 68 schools found lacking as of Q2 2025", source: "Council Journal", sourceUrl: "https://phlcouncil.com/ninaahmad/", date: "2025-09-10" },
      { area: "Healthcare", stance: "Co-sponsored Bill 250089: $8.5M for 12 new community health screening sites in environmental justice zones", recentVote: "Voted YES on Bill 250089 (13-2)", source: "Council Minutes", sourceUrl: "https://phlcouncil.com/ninaahmad/", date: "2025-08-20" },
      { area: "Economy", stance: "Authored amendment to Ordinance 240415 setting 35% MBE/WBE target for city contracts over $100K (prev. 25%)", source: "Ordinance 240415 Amendment", sourceUrl: "https://phlcouncil.com/ninaahmad/", date: "2025-07-15" }
    ]
  },
  {
    id: "3",
    name: "Kendra Brooks",
    party: "Other",
    office: "Philadelphia City Council At-Large",
    officeLevel: "Local",
    photo: bp("48625492448_641b940222_o.jpg"),
    bio: "Working Families Party council member at-large since Jan 2020. First third-party member elected to council in decades.",
    positions: [
      { area: "Economy", stance: "Sponsored Bill 240198 (Tenant Right to Counsel): mandatory legal representation for tenants facing eviction in cases under $2,500/mo rent; 4,100 tenants served in first year", recentVote: "Bill 240198 passed 13-4", source: "Council Record", sourceUrl: "https://phlcouncil.com/kendrabrooks/", date: "2025-09-18" },
      { area: "Justice", stance: "Voted YES on Resolution 250045 creating civilian oversight board with subpoena power; board seated with 11 members", recentVote: "Voted YES on Res. 250045 (10-7)", source: "Council Minutes", sourceUrl: "https://phlcouncil.com/kendrabrooks/", date: "2025-08-25" },
      { area: "Education", stance: "Co-introduced Ordinance 250201 redirecting $15M from tax increment financing to school district operating budget", source: "Council Journal", sourceUrl: "https://phlcouncil.com/kendrabrooks/", date: "2025-07-20" }
    ]
  },
  {
    id: "4",
    name: "Jim Harrity",
    party: "Democrat",
    office: "Philadelphia City Council At-Large",
    officeLevel: "Local",
    photo: avatar("Jim Harrity", "1D4ED8"),
    bio: "City Council member at-large since Nov 2022. Former labor organizer.",
    positions: [
      { area: "Economy", stance: "Authored Ordinance 250078 mandating prevailing wage on all city-funded projects over $50K (prev. threshold $250K); affects ~340 contracts/year", recentVote: "Ordinance 250078 passed 12-5", source: "Council Record", sourceUrl: "https://phlcouncil.com/jimharrity/", date: "2025-09-12" },
      { area: "Justice", stance: "Co-sponsored Resolution 250112 allocating $6.2M to 8 community violence intervention sites; sites report 31% reduction in incidents within coverage areas", source: "Council Minutes", sourceUrl: "https://phlcouncil.com/jimharrity/", date: "2025-08-18" },
      { area: "Healthcare", stance: "Voted YES on Bill 250089 funding 12 community health screening sites ($8.5M)", recentVote: "Voted YES (13-2)", source: "Council Minutes", sourceUrl: "https://phlcouncil.com/jimharrity/", date: "2025-07-25" }
    ]
  },
  {
    id: "5",
    name: "Rue Landau",
    party: "Democrat",
    office: "Philadelphia City Council At-Large",
    officeLevel: "Local",
    photo: avatar("Rue Landau", "3B82F6"),
    bio: "City Council member at-large since Jan 2024. Former Executive Director, Philadelphia Commission on Human Relations.",
    positions: [
      { area: "Justice", stance: "Introduced Ordinance 250155 expanding Fair Practices Act to cover source-of-income discrimination; 312 complaints filed in first 6 months", recentVote: "Ordinance 250155 passed 14-3", source: "Council Record", sourceUrl: "https://phlcouncil.com/ruelandau/", date: "2025-09-20" },
      { area: "Economy", stance: "Co-authored Resolution 250088 requiring racial equity impact assessments on all zoning changes over 50 units", source: "Council Minutes", sourceUrl: "https://phlcouncil.com/ruelandau/", date: "2025-08-15" },
      { area: "Education", stance: "Voted YES on Ordinance 250201 redirecting $15M TIF funds to school district operations", recentVote: "Voted YES (11-6)", source: "Council Journal", sourceUrl: "https://phlcouncil.com/ruelandau/", date: "2025-07-10" }
    ]
  },
  {
    id: "6",
    name: "Nicolas O'Rourke",
    party: "Other",
    office: "Philadelphia City Council At-Large",
    officeLevel: "Local",
    photo: bp("Untitled_design__12__fixed.png"),
    bio: "Working Families Party council member at-large since Jan 2024. Pastor and community organizer.",
    positions: [
      { area: "Economy", stance: "Co-sponsored Bill 250210 establishing $15.50/hr city minimum wage (state min $7.25); estimated to affect 48,000 workers", recentVote: "Bill 250210 in committee", source: "Council Journal", sourceUrl: "https://phlcouncil.com/nicolasorourke/", date: "2025-09-22" },
      { area: "Justice", stance: "Introduced Resolution 250167 for restorative justice pilot in 4 police districts; pilot diverted 280 cases from prosecution in Q1-Q2 2025", source: "Council Minutes", sourceUrl: "https://phlcouncil.com/nicolasorourke/", date: "2025-08-28" },
      { area: "Climate", stance: "Voted YES on Bill 250134 requiring city buildings over 50,000 sq ft to report energy usage annually; covers 1,200 buildings", recentVote: "Voted YES (12-5)", source: "Council Record", sourceUrl: "https://phlcouncil.com/nicolasorourke/", date: "2025-07-15" }
    ]
  },
  {
    id: "7",
    name: "Katherine Gilmore Richardson",
    party: "Democrat",
    office: "Philadelphia City Council At-Large",
    officeLevel: "Local",
    photo: avatar("Katherine G Richardson", "2563EB"),
    bio: "City Council member at-large since Jan 2020. Council President.",
    positions: [
      { area: "Justice", stance: "Led passage of Resolution 250045 (civilian oversight board with subpoena power); 11-member board seated and reviewing 145 complaints", recentVote: "Voted YES on Res. 250045 (10-7)", source: "Council Minutes", sourceUrl: "https://phlcouncil.com", date: "2025-09-18" },
      { area: "Economy", stance: "Sponsored Ordinance 250099 mandating pay transparency for city positions and contractors; applies to 32,000+ employees", recentVote: "Ordinance 250099 passed 15-2", source: "Council Record", sourceUrl: "https://phlcouncil.com", date: "2025-08-25" },
      { area: "Education", stance: "Allocated $3.2M in council discretionary funds to career readiness programs across 18 high schools", source: "Council Budget Office", sourceUrl: "https://phlcouncil.com", date: "2025-08-15" }
    ]
  },
  {
    id: "8",
    name: "Isaiah Thomas",
    party: "Democrat",
    office: "Philadelphia City Council At-Large",
    officeLevel: "Local",
    photo: avatar("Isaiah Thomas", "1E40AF"),
    bio: "City Council member at-large since Jan 2020. Community advocate focused on youth development.",
    positions: [
      { area: "Education", stance: "Authored Bill 250176 creating $25M Youth Opportunity Fund; funded 6,800 summer jobs and 42 after-school sites in 2025", recentVote: "Bill 250176 passed 16-1", source: "Council Record", sourceUrl: "https://phlcouncil.com", date: "2025-09-16" },
      { area: "Economy", stance: "Co-sponsored Ordinance 250122 requiring 30% local hiring on city-funded construction projects over $1M", recentVote: "Voted YES (14-3)", source: "Council Minutes", sourceUrl: "https://phlcouncil.com", date: "2025-08-28" },
      { area: "Healthcare", stance: "Voted YES on Bill 250089 ($8.5M for 12 community health screening sites)", recentVote: "Voted YES (13-2)", source: "Council Minutes", sourceUrl: "https://phlcouncil.com", date: "2025-08-12" }
    ]
  },
  {
    id: "9",
    name: "Mark Squilla",
    party: "Democrat",
    office: "Philadelphia City Council District 1",
    officeLevel: "Local",
    photo: bp("MarkSquilla12.jpg"),
    bio: "City Council member for District 1 (South Philadelphia, Center City) since 2012.",
    positions: [
      { area: "Economy", stance: "Introduced Ordinance 250044 creating South Philadelphia Commercial Corridor Fund ($4.8M); 92 storefront grants awarded averaging $48K", recentVote: "Ordinance 250044 passed 17-0", source: "Council Record", sourceUrl: "https://phlcouncil.com/marksquilla/", date: "2025-09-14" },
      { area: "Justice", stance: "Co-sponsored Resolution 250033 adding 45 surveillance cameras to Italian Market and East Passyunk corridors", source: "Council Minutes", sourceUrl: "https://phlcouncil.com/marksquilla/", date: "2025-08-20" },
      { area: "Climate", stance: "Voted YES on Bill 250101 allocating $12M for stormwater infrastructure upgrades in flood-prone District 1 zones", recentVote: "Voted YES (15-2)", source: "Council Record", sourceUrl: "https://phlcouncil.com/marksquilla/", date: "2025-07-18" }
    ]
  },
  {
    id: "10",
    name: "Kenyatta Johnson",
    party: "Democrat",
    office: "Philadelphia City Council District 2",
    officeLevel: "Local",
    photo: bp("Kenyatta_Johnson12.jpg"),
    bio: "City Council member for District 2 (South and Southwest Philadelphia) since 2012.",
    positions: [
      { area: "Economy", stance: "Led Ordinance 240389 (Anti-Blight Initiative): 1,400 vacant properties remediated; 220 converted to affordable housing in District 2", recentVote: "Ordinance 240389 passed 14-3", source: "Council Record", sourceUrl: "https://phlcouncil.com/kenyattajohnson/", date: "2025-09-20" },
      { area: "Education", stance: "Secured $2.8M in capital funds for renovations at 6 District 2 community schools", source: "Capital Budget FY2026", sourceUrl: "https://phlcouncil.com/kenyattajohnson/", date: "2025-08-15" },
      { area: "Healthcare", stance: "Co-sponsored Bill 250089 ($8.5M for 12 community health screening sites); 3 sites located in District 2", recentVote: "Voted YES (13-2)", source: "Council Minutes", sourceUrl: "https://phlcouncil.com/kenyattajohnson/", date: "2025-07-22" }
    ]
  },
  {
    id: "11",
    name: "Jamie Gauthier",
    party: "Democrat",
    office: "Philadelphia City Council District 3",
    officeLevel: "Local",
    photo: bp("Jamie_Gauthier_headshot.JPG"),
    bio: "City Council member for District 3 (West Philadelphia) since Jan 2020. Former executive director, Sustainable Business Network.",
    positions: [
      { area: "Climate", stance: "Authored Bill 250134 (Building Energy Disclosure): mandatory annual energy reporting for buildings over 50,000 sq ft; covers 1,200 buildings citywide", recentVote: "Bill 250134 passed 12-5", source: "Council Record", sourceUrl: "https://phlcouncil.com/jamiegauthier/", date: "2025-09-18" },
      { area: "Economy", stance: "Introduced Ordinance 250188 creating cooperative business incubator with $2.1M seed fund; 14 co-ops launched in first year", source: "Council Journal", sourceUrl: "https://phlcouncil.com/jamiegauthier/", date: "2025-08-22" },
      { area: "Justice", stance: "Voted YES on Resolution 250045 (civilian oversight board); voted NO on additional police overtime funding (Res. 250098)", recentVote: "YES on 250045, NO on 250098", source: "Council Minutes", sourceUrl: "https://phlcouncil.com/jamiegauthier/", date: "2025-07-30" }
    ]
  },
  {
    id: "12",
    name: "Curtis Jones Jr.",
    party: "Democrat",
    office: "Philadelphia City Council District 4",
    officeLevel: "Local",
    photo: bp("Curtis_Jones12.gif"),
    bio: "City Council member for District 4 (West and Northwest Philadelphia) since 2008. Longest-serving current district council member.",
    positions: [
      { area: "Economy", stance: "Secured $7.2M in FY2026 budget for Lancaster Avenue commercial corridor redevelopment; 28 storefronts renovated to date", source: "FY2026 Budget", sourceUrl: "https://phlcouncil.com/curtisjonesjr/", date: "2025-09-15" },
      { area: "Education", stance: "Partnered with Philadelphia Youth Network on Bill 250176 ($25M Youth Opportunity Fund); District 4 received 1,200 of 6,800 summer job slots", source: "Council Record", sourceUrl: "https://phlcouncil.com/curtisjonesjr/", date: "2025-08-18" },
      { area: "Justice", stance: "Voted YES on Resolution 250112 ($6.2M for 8 community violence intervention sites); 2 sites in District 4", recentVote: "Voted YES (13-4)", source: "Council Minutes", sourceUrl: "https://phlcouncil.com/curtisjonesjr/", date: "2025-07-25" }
    ]
  },
  {
    id: "13",
    name: "Jeffery Young Jr.",
    party: "Democrat",
    office: "Philadelphia City Council District 5",
    officeLevel: "Local",
    photo: avatar("Jeffery Young", "1D4ED8"),
    bio: "City Council member for District 5 (North and Northeast Philadelphia) since Jan 2024.",
    positions: [
      { area: "Justice", stance: "Introduced Resolution 250156 requesting PPD deploy 25 additional officers to District 5; homicides in district down 19% YoY (CompStat Q3 2025)", source: "PPD CompStat", sourceUrl: "https://www.phillypolice.com/crime-maps-stats/", date: "2025-09-20" },
      { area: "Economy", stance: "Co-sponsored Ordinance 250044 (Commercial Corridor Fund); secured $1.1M allocation for North Philadelphia storefronts", source: "Council Record", sourceUrl: "https://phlcouncil.com", date: "2025-08-25" },
      { area: "Education", stance: "Voted YES on Bill 250176 ($25M Youth Opportunity Fund)", recentVote: "Voted YES (16-1)", source: "Council Minutes", sourceUrl: "https://phlcouncil.com", date: "2025-07-20" }
    ]
  },
  {
    id: "14",
    name: "Michael Driscoll",
    party: "Democrat",
    office: "Philadelphia City Council District 6",
    officeLevel: "Local",
    photo: avatar("Michael Driscoll", "3B82F6"),
    bio: "City Council member for District 6 (Northeast Philadelphia) since June 2022.",
    positions: [
      { area: "Justice", stance: "Authored Resolution 250098 approving $4.5M police overtime for Roosevelt Blvd corridor; traffic fatalities down 22% on Blvd in 2025", recentVote: "Resolution 250098 passed 11-6", source: "Council Record", sourceUrl: "https://phlcouncil.com", date: "2025-09-16" },
      { area: "Economy", stance: "Introduced Bill 250199 designating Roosevelt Blvd as priority development zone with expedited permitting (90→45 day review)", source: "Council Journal", sourceUrl: "https://phlcouncil.com", date: "2025-08-22" },
      { area: "Education", stance: "Secured $1.6M in capital funds for HVAC upgrades at 4 Northeast Philadelphia schools", source: "Capital Budget FY2026", sourceUrl: "https://phlcouncil.com", date: "2025-07-18" }
    ]
  },
  {
    id: "15",
    name: "Quetcy Lozada",
    party: "Democrat",
    office: "Philadelphia City Council District 7",
    officeLevel: "Local",
    photo: bp("QuetcyLozada.jpg"),
    bio: "City Council member for District 7 (North Philadelphia) since Nov 2022. Succeeded Maria Quinones-Sanchez.",
    positions: [
      { area: "Education", stance: "Introduced Resolution 250178 mandating bilingual materials in all 216 district schools with >15% ELL enrollment; 89 schools now compliant (up from 34)", source: "Council Record", sourceUrl: "https://phlcouncil.com/quetcylozada/", date: "2025-09-14" },
      { area: "Immigration", stance: "Co-authored Ordinance 250145 codifying Philadelphia's sanctuary city status; prohibits city employees from inquiring about immigration status in 12 service categories", recentVote: "Ordinance 250145 passed 13-4", source: "Council Minutes", sourceUrl: "https://phlcouncil.com/quetcylozada/", date: "2025-08-20" },
      { area: "Economy", stance: "Secured $900K in grants for 62 Latino-owned small businesses on N. 5th Street corridor", source: "Commerce Dept Report", sourceUrl: "https://phlcouncil.com/quetcylozada/", date: "2025-07-22" }
    ]
  },
  {
    id: "16",
    name: "Cindy Bass",
    party: "Democrat",
    office: "Philadelphia City Council District 8",
    officeLevel: "Local",
    photo: bp("CindyBass12.jpg"),
    bio: "City Council member for District 8 (Northwest Philadelphia/Germantown) since 2012.",
    positions: [
      { area: "Economy", stance: "Authored Ordinance 240401 regulating stop-and-go stores: requires $50K annual license and security camera installation; 180 stores now compliant, 34 closed", recentVote: "Ordinance 240401 upheld on appeal", source: "Council Record", sourceUrl: "https://phlcouncil.com/cindybass/", date: "2025-09-18" },
      { area: "Justice", stance: "Voted YES on Resolution 250112 ($6.2M for 8 community violence intervention sites); 2 sites serve District 8", recentVote: "Voted YES (13-4)", source: "Council Minutes", sourceUrl: "https://phlcouncil.com/cindybass/", date: "2025-08-15" },
      { area: "Education", stance: "Allocated $1.4M in discretionary funds for after-school programs at 8 District 8 community centers", source: "Council Budget Office", sourceUrl: "https://phlcouncil.com/cindybass/", date: "2025-07-20" }
    ]
  },
  {
    id: "17",
    name: "Anthony Phillips",
    party: "Democrat",
    office: "Philadelphia City Council District 9",
    officeLevel: "Local",
    photo: bp("Anthony_Phillips_20251204_043429.jpg"),
    bio: "City Council member for District 9 (Far Northeast Philadelphia) since Nov 2022. Succeeded Cherelle Parker.",
    positions: [
      { area: "Justice", stance: "Co-sponsored Resolution 250098 ($4.5M police overtime for Roosevelt Blvd); secured 15 additional patrol officers for District 9", recentVote: "Voted YES on Res. 250098 (11-6)", source: "Council Minutes", sourceUrl: "https://phlcouncil.com/anthonyphillips/", date: "2025-09-20" },
      { area: "Economy", stance: "Introduced Bill 250211 for $3.5M Far Northeast commercial revitalization; 45 facade improvement grants awarded", source: "Council Journal", sourceUrl: "https://phlcouncil.com/anthonyphillips/", date: "2025-08-25" },
      { area: "Climate", stance: "Voted YES on Bill 250101 ($12M stormwater infrastructure); $2.8M allocated to Pennypack Creek flood mitigation", recentVote: "Voted YES (15-2)", source: "Council Record", sourceUrl: "https://phlcouncil.com/anthonyphillips/", date: "2025-07-18" }
    ]
  },
  {
    id: "18",
    name: "Brian O'Neill",
    party: "Republican",
    office: "Philadelphia City Council District 10",
    officeLevel: "Local",
    photo: avatar("Brian ONeill", "DC2626"),
    bio: "City Council member for District 10 (Far Northeast Philadelphia) since Jan 1980. Longest-serving member. Only Republican on council.",
    positions: [
      { area: "Economy", stance: "Voted NO on Ordinance 250078 (prevailing wage expansion) and Bill 250210 ($15.50 minimum wage); authored 3 amendments to reduce spending by $18M in FY2026 budget", recentVote: "NO on 250078, NO on 250210", source: "Council Record", sourceUrl: "https://phlcouncil.com", date: "2025-09-16" },
      { area: "Justice", stance: "Voted YES on Resolution 250098 ($4.5M police overtime); voted NO on Resolution 250045 (civilian oversight board)", recentVote: "YES on 250098, NO on 250045", source: "Council Minutes", sourceUrl: "https://phlcouncil.com", date: "2025-08-20" },
      { area: "Education", stance: "Voted NO on Ordinance 250201 ($15M TIF redirect to schools); co-sponsored Resolution 250190 supporting charter school expansion", recentVote: "NO on 250201, YES on 250190", source: "Council Record", sourceUrl: "https://phlcouncil.com", date: "2025-07-15" }
    ]
  },
  {
    id: "19",
    name: "Lawrence Krasner",
    party: "Democrat",
    office: "Philadelphia District Attorney",
    officeLevel: "Local",
    photo: bp("Lawrence_Krasner.jpg"),
    bio: "Philadelphia District Attorney since Jan 2018. Progressive prosecutor focused on criminal justice reform.",
    positions: [
      { area: "Justice", stance: "Conviction Integrity Unit reviewed 420 cases since 2018; 32 convictions overturned. Cash bail eliminated for 25 low-level charge categories; pretrial detention population down 38%", recentVote: "CIU 2025 Annual Report published", source: "DA's Office", sourceUrl: "https://www.phila.gov/districtattorney/", date: "2025-09-22" },
      { area: "Justice", stance: "Gun violence cases: 78% conviction rate on firearms charges in 2025 (up from 62% in 2018). Filed 1,847 gun charges YTD through Q3", source: "DA Annual Report 2025", sourceUrl: "https://www.phila.gov/districtattorney/", date: "2025-08-18" },
      { area: "Economy", stance: "Diversion program enrolled 3,200 participants in 2024; recidivism rate 18% vs. 45% for traditionally prosecuted cohort (3-year follow-up)", source: "DA Diversion Report", sourceUrl: "https://krasnerforda.com/", date: "2025-07-25" }
    ]
  },
  {
    id: "20",
    name: "Christy Brady",
    party: "Democrat",
    office: "Philadelphia City Controller",
    officeLevel: "Local",
    photo: bp("ChristyBrady2025.jpeg"),
    bio: "Philadelphia City Controller since Jan 2024. Responsible for auditing city departments.",
    positions: [
      { area: "Economy", stance: "Published 14 audit reports in 2025; identified $23M in wasteful spending across 6 departments. 78% of prior audit recommendations now implemented (up from 52%)", source: "Controller's Office", sourceUrl: "https://bradyforcontroller.com/", date: "2025-09-15" },
      { area: "Economy", stance: "Audit of city procurement found 22% of contracts lacked competitive bidding; issued 8 corrective action orders", source: "Procurement Audit 2025", sourceUrl: "https://bradyforcontroller.com/", date: "2025-08-20" },
      { area: "Education", stance: "School district facilities audit identified $340M deferred maintenance backlog across 216 schools; 42 buildings rated 'critical'", source: "Controller Facilities Audit", sourceUrl: "https://bradyforcontroller.com/", date: "2025-07-10" }
    ]
  },
  {
    id: "21",
    name: "Rochelle Bilal",
    party: "Democrat",
    office: "Philadelphia Sheriff",
    officeLevel: "Local",
    photo: avatar("Rochelle Bilal", "2563EB"),
    bio: "Philadelphia Sheriff since Jan 2020. First Black woman elected Sheriff of Philadelphia.",
    positions: [
      { area: "Justice", stance: "Implemented body cameras for all 180 sheriff deputies; de-escalation training hours increased from 8 to 40/year per deputy", source: "Sheriff's Annual Report", sourceUrl: "https://www.phila.gov/departments/sheriff/", date: "2025-09-18" },
      { area: "Economy", stance: "Reformed property sale process: owner-occupied homes now receive 6-month mediation before sale; foreclosure sales down 34% (2025 vs. 2019)", source: "Sheriff's Office", sourceUrl: "https://www.phila.gov/departments/sheriff/", date: "2025-08-22" },
      { area: "Justice", stance: "Launched mental health co-responder pilot with 12 licensed counselors; 890 crisis calls handled without arrest in 2025", source: "Sheriff's Office", sourceUrl: "https://www.phila.gov/departments/sheriff/", date: "2025-07-15" }
    ]
  },
  {
    id: "22",
    name: "Seth Bluestein",
    party: "Republican",
    office: "Philadelphia City Commissioner",
    officeLevel: "Local",
    photo: bp("Seth_Bluestein.jpeg"),
    bio: "Philadelphia City Commissioner since Feb 2022. Responsible for elections and voter registration.",
    positions: [
      { area: "Justice", stance: "Oversaw 2024 general election: 742,000 ballots processed with 99.97% accuracy rate; 0 successful legal challenges to results", source: "Commissioner's Report", sourceUrl: "https://vote.phila.gov", date: "2025-09-20" },
      { area: "Economy", stance: "Reduced per-ballot processing cost from $4.12 to $3.28 through automation; saved $620K in 2024 election cycle", source: "Commissioner's Budget Report", sourceUrl: "https://vote.phila.gov", date: "2025-08-18" },
      { area: "Education", stance: "Voter registration drives reached 18,400 high school seniors across 62 schools in 2024-2025; 71% registration rate", source: "Commissioner's Office", sourceUrl: "https://vote.phila.gov", date: "2025-07-20" }
    ]
  },
  {
    id: "23",
    name: "Lisa Deeley",
    party: "Democrat",
    office: "Philadelphia City Commissioner (Chair)",
    officeLevel: "Local",
    photo: avatar("Lisa Deeley", "1D4ED8"),
    bio: "Philadelphia City Commissioner and Chair since Jan 2016. Oversees elections and voter registration.",
    positions: [
      { area: "Justice", stance: "Expanded early voting from 1 to 17 satellite locations; mail-in ballot processing time reduced from 72 to 18 hours through $2.4M equipment investment", source: "Commissioner's Office", sourceUrl: "https://vote.phila.gov", date: "2025-09-16" },
      { area: "Economy", stance: "Consolidated 3 election warehouse facilities into 1; annual savings of $1.8M in lease and staffing costs", source: "Commissioner's Budget Report", sourceUrl: "https://vote.phila.gov", date: "2025-08-15" },
      { area: "Education", stance: "Launched multilingual voter guide in 8 languages (up from 3); distributed 340,000 guides in 2024 cycle", source: "Commissioner's Office", sourceUrl: "https://vote.phila.gov", date: "2025-07-10" }
    ]
  },
  {
    id: "24",
    name: "Ken Krawchuk",
    party: "Other",
    office: "Libertarian Candidate for Governor (2018)",
    officeLevel: "State",
    photo: bp("Ken_Krawchuk.jpg"),
    bio: "Libertarian Party activist. IT entrepreneur. Ran for Governor of Pennsylvania in 2014 and 2018 (49,229 votes, 1.0%).",
    positions: [
      { area: "Economy", stance: "Platform: abolish property tax ($14B/year revenue); eliminate personal income tax (3.07% flat rate). PA state spending grew 186% from 1990-2018 vs. 81% inflation (BLS CPI data)", source: "Ballotpedia Survey", sourceUrl: "https://ballotpedia.org/Ken_Krawchuk", date: "2025-09-10" },
      { area: "Justice", stance: "Platform: pardon all non-violent drug offenders in PA (~18,000 incarcerated per PA DOC 2018 data). Separate state from marriage licensing", source: "Ballotpedia Survey", sourceUrl: "https://ballotpedia.org/Ken_Krawchuk", date: "2025-08-15" },
      { area: "Education", stance: "Platform: Universal Charitable Giving Act — redirect welfare spending ($12.4B PA budget line) to private charitable organizations via tax credits", source: "Candidate Forum", sourceUrl: "https://ballotpedia.org/Ken_Krawchuk", date: "2025-07-20" }
    ]
  }
];
