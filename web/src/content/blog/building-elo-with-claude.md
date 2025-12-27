---
title: "Building Elo: A Human-AI Collaboration Story"
date: 2024-12-25
author: "Bernard Lambeau & Claude"
lead: "Elo was built in a single day through an intense collaboration between a human developer and Claude Code. Here's what we learned about making AI pair programming actually work."
---

## The Starting Point

It began with a nearly empty directory: just a README with an idea. Bernard had a clear vision—a small expression language that could compile to Ruby, JavaScript, and SQL—but no code. The first prompt was simple:

> "Read README. I want to invent a small language that compiles to Ruby, Javascript and SQL. Let's start with arithmetic expressions involving scalars and (open) variables."

## What Worked: The Task File Pattern

The most effective pattern we discovered was the **task file**. Before each significant change, Bernard would write a short markdown file describing the problem, the idea, and follow-up refinements after seeing results.

## Vision vs. Execution

A clear division of labor emerged naturally:

- **Bernard** provided the vision, domain expertise, design principles, and course corrections
- **Claude** handled implementation details, proposed architectural solutions, wrote the code, and maintained test coverage

**Here's the remarkable part: Bernard didn't write a single line of code.** Not one. He wrote specifications in markdown files, reviewed outputs, and provided feedback—but never touched the TypeScript.

## The Result

In roughly 24 hours of collaboration, we built a complete expression language with a parser, type system, three compilers, a standard library, a CLI tool, and a documentation website. Not bad for a day's work.

Elo isn't just a demonstration that AI can write code. It's a demonstration that **humans and AI can build together**—each contributing what they do best.

---

The complete history of our collaboration is preserved in [the task files on GitHub](https://github.com/enspirit/elo/tree/main/.claude/tasks).
