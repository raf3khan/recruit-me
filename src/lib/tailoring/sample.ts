import type { CandidateProfile, JobPosting } from "./schemas";

/** A made-up fresh graduate used by the demo mode and the tests. */
export const SAMPLE_PROFILE: CandidateProfile = {
  fullName: "Noura Al-Harbi",
  email: "noura.example@example.com",
  phone: "+966 5X XXX XXXX",
  city: "Riyadh",
  country: "Saudi Arabia",
  linkedin: "linkedin.com/in/noura-example",
  portfolio: null,
  education: [
    {
      id: "edu-0",
      institution: "King Saud University",
      degree: "Bachelor of Science",
      field: "Information Systems",
      location: "Riyadh",
      startDate: "Sep 2021",
      endDate: "Jun 2025",
      gpa: "4.52/5",
      highlights: [
        "Graduated with Second Class Honours",
        "Relevant courses: Database Systems, Business Analytics, Systems Analysis and Design",
      ],
    },
  ],
  experience: [
    {
      id: "exp-0",
      organization: "Saudi Telecom Company (stc)",
      role: "Data Analytics Co-op Trainee",
      type: "coop",
      location: "Riyadh",
      startDate: "Jan 2025",
      endDate: "Jun 2025",
      bullets: [
        "Built Power BI dashboards for the customer care team tracking weekly complaint volumes",
        "Cleaned and merged 3 data sources in SQL to create a single churn report",
        "Presented findings to the team manager every two weeks",
      ],
    },
    {
      id: "exp-1",
      organization: "Riyadh Season",
      role: "Event Volunteer",
      type: "volunteer",
      location: "Riyadh",
      startDate: "Oct 2023",
      endDate: "Dec 2023",
      bullets: ["Guided visitors and handled questions in Arabic and English at a high-traffic zone"],
    },
  ],
  projects: [
    {
      id: "proj-0",
      name: "Clinic Appointment No-Show Predictor",
      context: "Graduation project",
      technologies: ["Python", "pandas", "scikit-learn"],
      bullets: [
        "Trained a logistic regression model on 12,000 anonymised appointment records",
        "Reached 78% accuracy and proposed SMS reminders for high-risk bookings",
      ],
      link: null,
    },
  ],
  certifications: [{ id: "cert-0", name: "Google Data Analytics Certificate", issuer: "Coursera", date: "2024" }],
  skills: ["SQL", "Power BI", "Python", "Excel", "Data cleaning", "Presentation"],
  languages: [
    { name: "Arabic", level: "Native" },
    { name: "English", level: "IELTS 7.0" },
  ],
  activities: ["Member, KSU Data Science Club (2022-2024)"],
};

export const SAMPLE_JOB: JobPosting = {
  title: "Junior Data Analyst",
  company: "Tamara",
  location: "Riyadh",
  url: null,
  description: `We are looking for a Junior Data Analyst to join our Risk team in Riyadh.

Responsibilities:
- Build and maintain dashboards that track credit and fraud KPIs
- Write SQL queries to answer business questions
- Present insights to stakeholders

Requirements:
- Bachelor's degree in Information Systems, Computer Science, Statistics or a related field
- Strong SQL skills
- Experience with a BI tool such as Power BI or Tableau
- Good communication in English and Arabic

Nice to have:
- Python for data analysis
- Fintech experience`,
};
