# Inbox Copilot — AI reply drafting (PRD)

> **Anonymized synthetic sample** — not a real product document. Authored for story 260624-fbd as a
> few-shot exemplar and eval fixture for `/artifact-critique`. Names, numbers, and products are invented.
> Exercises the **AI axis** (applicable: an LLM-backed feature) and its Behavior-Contract check.

## 1. Problem

In the last quarter, support measured an average first-reply time of six hours, and exit surveys named
slow replies as the top complaint. Agents spend most of a ticket writing the reply from a blank box.

## 2. Proposal

Inbox Copilot drafts a suggested reply for each incoming ticket so the agent edits and sends instead of
writing from scratch. Drafting the reply will cut reply time because typing is the slowest step in
handling a ticket.

## 3. Scope

In scope: English-language email tickets. Out of scope: chat, phone, and non-English tickets in v1.

## 4. Metrics

We will track median first-reply time and the percentage of drafts sent without edits.

## 5. Model quality

The drafts come from a large language model prompted with the ticket and the customer's history. We will
monitor draft quality and improve the model over time as we gather agent feedback.

## 6. Rollout

We will enable Copilot for ten percent of agents first, then expand once reply time improves.

## 7. Stage & context

This adds to our existing support console, which hundreds of agents already use every day.

## 8. Risks

The main risk is that agents over-trust a draft and send a customer the wrong information.
