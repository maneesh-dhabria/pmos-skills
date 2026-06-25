# Unified Asset Pipeline — internal media-processing platform (PRD)

> **Anonymized synthetic sample** — not a real product document. Authored for story 260624-fbd as a
> few-shot exemplar and eval fixture for `/artifact-critique`. Names, numbers, and products are invented.
> Exercises the **Pricing → N/A** (internal tool) and **AI → N/A** (no model-backed feature) conditionals.

## 1. Problem

Three product teams each run their own media transcode-and-thumbnail jobs on hand-rolled scripts. The
scripts drift, break differently, and on-call engineers spend roughly a day a week firefighting failed
batches. Two of the three teams have asked platform for a shared service in the last quarter.

## 2. Proposal

Build a Unified Asset Pipeline: a single internal service that ingests an upload, runs transcode +
thumbnail + metadata extraction, and writes results to the shared asset store. Teams call one API instead
of maintaining their own scripts.

## 3. Scope

In scope for v1: image and video transcode, thumbnail generation, and a status webhook. Out of scope:
audio, live streaming, and a self-serve UI — teams integrate via the API only.

## 4. Success metrics

We will measure success by the number of teams onboarded and the number of jobs processed per day. We
expect all three teams onboarded within a quarter and over ten thousand jobs a day at steady state.

## 5. Rollout

Onboard the team that asked first as a design partner, then the second team, then migrate the third off
its legacy scripts. Each migration is gated on the partner team signing off on parity.

## 6. Stage

This is a platform consolidation of capabilities all three teams already run in production; the goal is
reliability and a single throat to choke, not market discovery.
