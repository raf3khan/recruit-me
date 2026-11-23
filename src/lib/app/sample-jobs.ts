import type { JobPosting } from "@/lib/tailoring/schemas";

/**
 * Made-up companies and jobs for development, so the list isn't empty before
 * the job feed exists. Never shown in production.
 */
export const SAMPLE_JOBS: JobPosting[] = [
  {
    title: "Junior Data Analyst",
    company: "Waha Pay",
    location: "Riyadh",
    url: null,
    description:
      "Waha Pay is a payments company. Our credit risk team is hiring a Junior Data Analyst. You will build dashboards in Power BI, write SQL to prepare data, and present findings to the team. Requirements: bachelor's degree in Information Systems, Computer Science or Statistics; strong SQL; Power BI or Tableau; Python is a plus; Arabic and English. Fintech experience is nice to have.",
  },
  {
    title: "Graduate BI Developer",
    company: "Rimal Analytics",
    location: "Riyadh",
    url: null,
    description:
      "Rimal Analytics builds reporting for retail and government clients. As a Graduate BI Developer you will design Power BI dashboards, merge data sources with SQL, and present results to clients. Requirements: recent graduate in an IT-related field, SQL, Power BI, good communication. Experience with Azure Data Factory is preferred.",
  },
  {
    title: "Data Analyst, Patient Operations",
    company: "Sadu Health",
    location: "Jeddah",
    url: null,
    description:
      "Sadu Health runs outpatient clinics. Join Patient Operations to analyse appointment data, reduce no-shows and report weekly. Requirements: degree in Information Systems or similar, Python (pandas, scikit-learn), SQL reporting, interest in healthcare. A project on healthcare data is a strong plus.",
  },
  {
    title: "Operations Analyst (Graduate Program)",
    company: "Najd Logistics",
    location: "Dammam",
    url: null,
    description:
      "Najd Logistics graduate program: a 12-month rotation for fresh graduates in operations analytics. You will report on deliveries with Excel and SQL, build dashboards, and support the supply chain team. Requirements: recent bachelor's degree, Excel, basic SQL, willingness to learn. Supply chain coursework is a plus.",
  },
  {
    title: "Junior Insights Analyst",
    company: "Dana Retail",
    location: "Riyadh",
    url: null,
    description:
      "Dana Retail is hiring a Junior Insights Analyst to study customer behaviour. Requirements: retail or e-commerce experience, Google Analytics, data cleaning, presenting insights to marketing. Excel required.",
  },
];
