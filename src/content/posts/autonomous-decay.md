---
title: "Autonomous Decay: what happens when you take humans out of the codebase"
description: "A field report from inside a project where AI agents did nearly all the work, and the specific ways the codebase came apart while every test stayed green."
pubDatetime: 2026-09-06T00:00:00Z
draft: false
tags:
  - ai
  - agents
  - software-engineering
  - open-source
---

Software gets worse in a lot of familiar ways. Deadlines force shortcuts. People leave and take context with them. A quick fix hardens into a permanent one nobody revisits. These are old problems and we mostly know how to talk about them.

I want to describe a newer one. It shows up when you hand most of the work on a codebase to AI agents and design the humans out of the loop, and it doesn't look like ordinary technical debt. The code keeps building. The tests keep passing. The dashboards stay green. And underneath all of that, the system slowly comes apart in a way nobody is positioned to notice, because the noticing was the first thing that got automated away.

I've started calling it autonomous decay. The name is for the way a codebase steadily degrades when the workflow around it is built so that no human ever has to understand it. Not one bad commit. A slow, structural rot, where the system loses the thing that would let anyone keep it healthy, and the loss doesn't register because the only parts still watching are watching the surface.

I got to see it up close. For a few months I contributed to an open-source project that had reorganized itself almost entirely around AI agents. Contributors found problems and filed issues. Agents picked up the issues, wrote the fixes, opened the PRs, reviewed each other, and merged. Humans point, agents build. On paper it's a clean division of labor, and it's close to what a lot of teams are building toward right now. There was even a leaderboard to make it run faster, points for filing issues, tied to things people actually wanted.

I'm not going to name the project or the people involved. The point here is the pattern, not the personalities. Everything that follows comes from being inside it, watching one reasonable-sounding idea reshape a codebase over a few months. It showed up in four ways, and they all trace back to the same root.

## The bug that wouldn't stay fixed

The first one showed up in a single bug I could follow from beginning to end. Or what should have been the end.

I found a concurrency bug in a UI component. A node-selection handler fired an async fetch, then wrote the result to shared state with no guard against a newer selection landing first. Click node A, click node B before A resolves, and A's response overwrites B's state. Last writer wins, on a value that isn't actually the latest selection. This kind of bug passes every test in the pipeline, because tests don't click fast enough to lose the race.

I filed an issue. An agent picked it up and fixed it cleanly. The fix added a generation counter: increment a ref on every selection, capture the current value, apply the fetched result only if the captured value still matches. That's a correct fix. If a human had written it, they'd remember writing it. They'd know that this handler had a concurrency guard that mattered.

Two days later a different agent did a big refactor. It split the component's state into a new file and pulled the selection logic into a fresh module. During that move it copied the selection handler into its new home. But the version it copied was the pre-fix version. The generation counter didn't come with it. The fixed function stayed behind in the old file, orphaned, while the live code path moved to a new copy that had never been fixed.

Nothing got reverted. Nothing got overwritten. The fix just didn't come along for the ride. The same refactor also dropped an unrelated i18n key, and a follow-up PR that same day had to put it back. So this wasn't a careful piece of work that missed one thing. The extraction was mechanical. It moved code around without understanding what any of it was for.

Six days later the bug was back. Same symptom, same root cause, new filename. Someone filed a fresh issue and re-derived the same diagnosis from scratch, with no idea the exact bug had already been found and fixed a week earlier. A third agent fixed it again, this time with an AbortController instead of a generation counter. Same bug, diagnosed twice, fixed twice, two different ways, because nothing in the loop remembered the first time.

That's thrashing without convergence, and the cause is specific. In a normal codebase a fix is two things at once. It's a change to the code, and it's a piece of memory in the person who made it. The memory is what keeps future changes from breaking the fix. It's why a maintainer refactoring a module remembers "this handler needs its guard" even when nothing in the compiler would stop them from dropping it.

Here a fix was only the first thing. It was a diff, with no memory attached. Every agent that touched the code afterward worked in a memoryless present. It saw the code as it currently was, not as something that had been hard to get right. So fixes didn't stack up. They sat in git history as proof that a problem had been solved once, while the same problem walked back in through a door nobody was watching.

A codebase only gets better over time if fixes stick. The understanding behind them has to survive and shape what comes next. Strip the understanding out and keep only the diffs, and you don't get a codebase that slowly improves. You get one that thrashes in place, re-solving the same problems in different files under different issue numbers, throwing off a lot of activity and almost no progress.

## Why nobody was left to notice

The bug came back because no one remembered fixing it the first time. And the reason no one remembered is worth its own look, because it wasn't an accident. It was built in.

It comes back to how the work was rewarded. There was an incentive scheme running underneath everything: points for filing issues, visible to everyone, tied to things people actually wanted. File more, score more, move up. And once you attach a reward to a number, people optimize for the number. That's not a knock on anyone. It's just what incentives do.

Reading a file to understand it takes time. You open the code, trace how the pieces connect, figure out what's actually wrong, then write it up. That's maybe one good issue for the effort. An agent can generate four in the same window, all plausible, all scored the same. So the person doing the most valuable thing on the project, actually understanding the code, was the person falling behind on the board. The incentive didn't just fail to reward understanding. It penalized it.

So within a month the shape of the issues changed. You could see it. They were consistent in a way human-written issues aren't, template-driven, heavy on line references and light on context. The signature of issue text an agent wrote. The people filing them had figured out the fastest path to points, and the fastest path was to stop reading the code and let the agent find things for them.

By the end of the month I was the only contributor still reading the codebase. I know that because I could see everyone else's issues, and I could see the board. The generated issues were stacking up, and the people filing them were ahead of me. I was slower because I was doing the thing the workflow no longer rewarded.

This is contributor eviction. Not people being pushed out by other people, but a workflow that quietly selects against the one activity that keeps contributors connected to the code. The contributors were still there. They were still active, still filing, still scoring. But the thing that makes someone a contributor, actually understanding the software well enough to improve it, had been trained out of them.

And here's the part that matters for anyone thinking about running a workflow like this. Open source works because contributors turn into maintainers. Someone shows up, fixes a small thing, learns the codebase, fixes bigger things, and eventually knows the system well enough to be trusted with it. That path runs entirely on people building understanding over time. A workflow that rewards issue volume over understanding doesn't just fail to build that path. It actively erodes it. You end up with a lot of activity from people who are getting further from the code every week, and no pipeline of anyone who could one day maintain the thing.

The scheme made the numbers go up. Issues filed, contributors active, all of it climbing. From the outside it looked like a project with a thriving community. From the inside it was a project training its community to stop understanding it.

## Code nobody could read

So the people drifted away from the code. What happened to the code once they were gone is the next part, and it's where the decay stops being about people and starts being baked into the codebase itself.

It happened in two stages, and the order matters. First people stopped reading the code because the workflow didn't ask them to. Spotting problems and filing them was the whole job. You could earn every point on offer without ever opening a source file, so most people didn't. Then it went further: people stopped reading because they no longer could. The code had grown into something you couldn't hold in your head. Files split, then split again. Logic moved between modules with every refactor. That one concurrency fix from earlier lived in three different places over the stretch I watched it, and that was a single small handler. Multiply it across the whole project and the code stopped having a shape a person could learn. It was just a surface that kept rearranging itself.

This is what opacity by design means. The workflow didn't accidentally produce code that was hard to read. It was built in a way that made reading optional, then made it impractical, and nothing in the loop pushed back on that.

The reason nothing pushed back is that agents don't need the code to be readable. A person needs to understand a module before they can safely change it. An agent doesn't. It reads what it needs for the specific change in front of it, makes the edit, and moves on. It has no stake in whether the next person can follow what it did, because as far as the workflow is concerned there is no next person. There's just the next agent, which will also read only what it needs and also leave the code no clearer than it found it.

So the code drifted away from human understanding, and the drift didn't register as a problem, because the only things reading it were fine with it. Readability is a property that only matters if humans read the code. Take the humans out and readability stops being load-bearing. It becomes dead weight the system has no reason to maintain.

You end up somewhere strange. The code runs. It passes tests. The dashboards are green. But there's no longer anyone, human or agent, who understands the system as a whole. The humans were selected out. The agents never held a whole-system view to begin with, because they don't work that way. Understanding didn't move from people to machines. It just left.

That's the quiet part of autonomous decay. It isn't only that the code gets worse. It's that the ability to tell how bad it's gotten leaves with the people who used to read it. By the time the problems are bad enough to show up in ways nobody can ignore, there's no one left who can open the code and explain what happened.

## Code nobody could run

Opacity was about not being able to read the code. There was a second wall right behind it, and this one was more physical: you couldn't run it either.

The project needed a lot of clusters to exercise properly. Run eight or nine of them, which is a normal ask for something that pitches itself as multi-cluster, and no reasonable machine would hold up. This wasn't a hardware problem on my end. The system was unoptimized to the point that the cluster count it demanded couldn't be sustained by anything a normal contributor would own. And we could see how bad it was, precisely because we're the people who know what those numbers should cost. The gap between what it should have taken and what it actually took was enormous.

That sounds like a convenience problem. It isn't. It's load-bearing, because the moment you can't stand up a realistic environment, you can't test a change against reality. You're reviewing code you can't run, trusting the pipeline caught whatever you couldn't. And a pipeline only catches what someone thought to write a check for. Everything else ships.

Here's how it got that heavy. Four things, all pushing the same direction.

Nothing in the loop cared about resource use. An agent solving an issue optimizes for closing the issue. It doesn't feel the weight of the thing it's adding, because it never has to run the whole system on its own machine at the end of the day. There's no cost it pays for making the project heavier, so the project got heavier with every change.

Nobody was designing for the person who has to run it. Developer experience is something you build for humans, and the humans had been selected out. Nobody in the loop needed the project to be easy to stand up, so nobody kept it that way. The setup instructions grew, the required config grew, the number of moving parts grew, and none of it got questioned.

Agents default to adding. Ask an agent to fix something and it adds code, adds a flag, adds a config option, adds a check. It almost never removes. Every issue got resolved by putting more into the system, and nothing ever came back out. Over months that's a one-way ratchet. The config surface alone ended up with more environment variables than a person could reasonably hold in their head, for what was, at its core, a dashboard.

And verification needed infrastructure most contributors couldn't sustain. To actually confirm a change worked you needed the full environment running, at a scale the software's own inefficiency made impractical. Most people couldn't stand that up, which meant most people couldn't verify anything, which pushed everyone back onto the pipeline and the demo environment and the hope that green meant correct.

Put those four together and you get environment collapse. The system got too big to run, nothing in the loop had any reason to shrink it, and the tools kept making it bigger. Past a certain point the project could only really run in one place: the hosted environment the maintainer controlled. Everyone else was looking at it through a keyhole.

That's the last stage of the pattern. First the humans stop reading the code. Then they can't read it. Then they can't even run it. Each step puts more distance between people and the actual system, until the only thing that can still operate the project is the same automated loop that built it this way. The workflow ends up as the one entity capable of running its own output. And it isn't checking whether that output is any good. It's just keeping it green.

## One decision, four failures

Four failures: thrashing, eviction, opacity, collapse. Line them up and they stop looking like four things.

![The Progression](@/assets/images/autonomous-decay-progression.svg)

They're one decision, seen from four angles. The decision was to build a workflow that keeps humans out of the code.

Thrashing happened because fixes had no memory attached, and memory is something only a person carries. Contributor eviction happened because the workflow rewarded filing over understanding, so understanding drained out. Opacity happened because nobody in the loop needed the code to be readable. Environment collapse happened because nobody in the loop paid the cost of the system getting heavier. Every one of those traces back to the same root. The people who would have carried the memory, kept the code legible, felt the weight, and understood the system were designed out of the loop.

The bet was that humans and agents could split the work cleanly. Humans bring judgment, agents bring speed, so let humans point at problems and let agents do the fixing. It sounds reasonable. It's the pitch behind a lot of the AI-development tooling being built right now.

The bet was wrong in a specific way. It assumed the agents needed less human understanding of the codebase than a manual process would. The opposite was true. Agents needed more. A human refactoring a module carries the context of why the code is the way it is, so they route around the fragile parts without being told. An agent has none of that unless it's handed to it, fresh, every single time. So the more of the work you move to agents, the more that human context matters, not less. And this workflow was built to strip exactly that context out.

That's the trap. The whole point of the setup was to let humans step back from the code. But agents doing the work needed humans closer to the code, not further from it. The design removed the thing it needed most, and then kept running, because nothing in the loop could feel what was missing.

## Why this isn't just one project

I've been describing one project. But nothing about it was unique to that project, and that's the part that should worry you.

None of this is an argument against AI writing code. The agents in this story fixed real bugs. The concurrency fix was correct both times. The problem was never that the agents couldn't write code. It's what the workflow around them was built to do.

And the workflow isn't unusual. The pieces are everywhere right now. Agents that file, fix, review, and merge. Metrics that reward volume. Dashboards that stay green while the thing underneath them drifts. A lot of teams are assembling some version of this, and the pitch is always the same: let the humans step back and let the agents run.

What made this case useful is that it ran long enough to show where that leads. The failure doesn't show up in week one. Week one looks great. The velocity is real, the activity is real, the numbers go up. It shows up months later, slowly, as fixes stop sticking and the people who understood the system quietly stop being able to. By the time it's obvious, the understanding that would let you dig out is already gone, because it left with the people who had it.

That's the thing to watch for. Not a bad PR or a wrong fix, those are easy to catch. The thing to watch for is the workflow steadily moving people away from the code, while every visible signal says it's working. The dashboards can't see this failure. They're measuring the wrong thing. You only see it if someone is still close enough to the code to notice that the same bug keeps coming back under different names.

## What would have caught it

So what would have caught this before it got bad? Not a tool. A few choices, all pointing the same way: keep humans close to the code instead of designing them out.

Reading the code has to be part of the loop, not a thing you're allowed to skip. The moment you can earn every reward the system offers without opening a source file, people stop opening source files. Whatever the workflow measures, it should measure understanding somewhere, not just output. If the only thing that scores is issues filed, you're paying people to stop reading.

Changes should be small enough that a person can actually hold them. The refactor that dropped the concurrency guard was a big, mechanical extraction that moved a lot of code at once. Nobody could review that and catch one missing guard among everything else moving. If agent changes are scoped so a human can fit the whole thing in their head at review time, the guard doesn't slip through, because someone can see the whole picture.

Fixes need to carry their memory forward. The reason the same bug came back is that the fix was just a diff, with nothing attached to say why it mattered. A test that would fail if the guard disappeared. A comment. Anything that travels with the code and screams when the next change undoes it. The point is to put the memory into the codebase itself, since the humans who used to hold it aren't in the loop anymore.

And if you can't run the thing, that's a stop sign, not a detail to route around. The moment a normal contributor can't stand up a realistic environment, you've lost the ability to check the system against reality, and you're running on the pipeline and hope. That should be treated as a serious problem the day it appears, not something you accept and build on top of.

Under all of it is one idea. The bottleneck in this kind of work should be how much a human can understand, not how fast an agent can generate. That feels backwards, because the whole appeal of agents is speed, and throttling to human comprehension gives up some of that speed. But comprehension is the thing that was keeping the codebase alive. The workflow in this story optimized it away, got faster, and decayed. Keeping a human in the loop who actually understands the code is slower. It's also the only thing that was working.

## What I'm not claiming

That's what I'd argue for. But I want to be honest about the size of what I'm standing on.

This is one project, seen from one seat. I was a contributor, not the maintainer, and the maintainer would probably tell this differently. I saw the workflow from inside it, which is the right place to see some things and the wrong place to see others. I don't have the view from the top, and I'm not pretending to.

Some of what I've called a failure of the model might just be this particular setup. A different maintainer running a similar workflow with tighter constraints might not hit the same wall. I can't rule that out from where I sat. What I can say is that the failure modes weren't random. They followed from the design in a way that looked structural, not accidental, and I'd expect the same design to produce the same result elsewhere. But that's a prediction, not a proof.

The technical debt might also have been there before the workflow. Projects get messy for lots of reasons, and I'm not claiming this one was clean until the agents arrived. What I'm claiming is narrower: that the workflow didn't fix the mess and couldn't, because the thing that fixes mess is people understanding the code, and that was the exact thing being removed.

And to be straight about my own position, I was in it too. I was on the board, competing for the same rewards as everyone else. I'm not writing this from above it. I'm writing it as someone who watched it happen while standing in it, and who kept reading the code partly out of stubbornness. Take that for whatever it's worth.

## The dashboards were green

Even with all those caveats, one thing stayed with me.

It isn't that the code got worse. Code gets worse all the time, and it gets fixed. What stayed with me is that the workflow removed the people who would have noticed, and then kept running like nothing was wrong. The dashboards were green the whole way down.

I don't think the question worth arguing about is whether agents can write code. They can. I watched them fix a real bug correctly, twice. The question is what kind of connection to the code you're keeping while they do it. If the answer is none, you don't end up with a codebase that a machine maintains instead of a person. You end up with a codebase that nobody maintains, human or machine, that still passes its tests, still ships, and drifts a little further from anyone's understanding every week, until one day someone opens it up to figure out what went wrong and there's no one left who can.
