# BioPharma Sentinel Intelligence Tools

This platform contains highly strategic analyst tools. Below are deep-dives into the newly added Phase 3 compound and intelligence features.

## Geographic Intelligence (`get_geographic_intelligence`)
Maps the international scope of clinical trials. Extends ClinicalTrials.gov location structures to categorize trial site density geographically. Aggregates data by nation and synthesizes into broader regions (North America, Europe, Asia-Pacific) mapped against `PHASE_FILTER_MAP` implementations.

## Modality Breakdown (`get_modality_breakdown`)
Deconstructs a therapeutic area into operational domains. Determines if investments lean towards Small Molecule, Biologicals, Genetic, or Device platforms. Leverages explicit intervention types natively exposed by CT.gov's internal schema.

## Enrollment Intelligence (`get_enrollment_intelligence`)
Generates actionable velocity metrics. By cross-mapping `startDateStruct`, `completionDateStruct`, and `enrollmentInfo`, analysts gain direct insight into exact Site Density distributions and operational trial completion trajectories.

## Endpoint Landscape (`get_endpoint_landscape`)
Clustering algorithms to condense scattered `primaryOutcomes`. Recognizes keywords classifying OS (Overall Survival), PFS (Progression-Free Survival), ORR (Objective Response Rate) and Biomarker focus areas.

## Regulatory Landscape (`get_regulatory_landscape`)
Integrates the OpenFDA API to directly query FDA Application records and Submissions. Detects Orphan designations automatically, connecting the final link between trial pipeline efforts and actual commercial licensing success.

## Compound Executive Tools

### Company Deep Dive (`get_company_deep_dive`)
Orchestrates parallel intelligence extraction utilizing `p-limit` and internal Server Tool calls. One command generates an entire 360-degree briefing on a company encompassing: Technical Success (PoS), Pipeline Breadth, Conversion Velocity, and Global Footprints.

### Compare Companies (`compare_companies`)
An automated head-to-head generator evaluating two competing sponsors. Extracts and normalizes their aggregated competitive benchmarks in isolated silos for clear analytical contrast.
