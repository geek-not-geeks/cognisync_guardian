# CogniSync Guardian

A task-management system that doesn't just warn you when you're burning out — it changes your schedule for you. It tracks sleep, energy, and workload, and when burnout risk crosses a threshold, it caps how much new work you can take on, locks demanding tasks until you're in better shape, and pushes deadlines back on its own instead of leaving that decision to you.

I built this because every wellbeing app I'd used did the same useless thing: show a red bar and leave you to ignore it. I wanted something that actually governed the schedule instead of just reporting on it.

## Why confidence, specifically

Out of everything I could have tracked, I picked self-reported task confidence because it's the one signal you can measure before the work even starts. I'd watched this gap before, in a completely different setting: someone telling me "I'm fine" right before an exam, when what actually happened on the page said otherwise. I wanted to know whether a model could catch that same mismatch — between how sure someone says they are and how things actually turn out — before the day is over, not after.

## What it does

- Models burnout risk from sleep, energy, and workload data, recalculated as the user logs each day
- At high burnout, the scheduler actively intervenes: caps how many new tasks can be added, locks the most demanding tasks until burnout drops, and automatically pushes deadlines back rather than leaving the user to decide
- Runs a from-scratch logistic regression module that checks whether a user's stated confidence on a task actually predicts whether they complete it
- Feeds real usage data back into the system over time, so later scheduling decisions are informed by what actually happened, not just what was predicted at the start
- Full-stack web app: React/TypeScript frontend, Supabase for auth and data storage, deployed on Cloudflare Workers

## How it's built

**The burnout model.** Each day, the user logs sleep, a self-rated energy level, and their current workload. These three feed a running burnout score rather than a one-off reading, so a single bad night doesn't immediately flag the user as burned out — it's the trend that matters. Once the score crosses a set threshold, the system moves from passive tracking into active governance.

**The scheduling governor.** This is the part that makes the project more than a dashboard. Instead of a warning banner, crossing the burnout threshold directly changes what the user can do: new tasks above a capacity limit can't be added, tasks tagged as demanding get locked (greyed out and non-interactive) until burnout eases, and deadlines on flexible tasks get pushed back automatically. The intent was to remove the moment where a stressed person has to make a good decision about their own workload — the system makes it for them instead.

**The logistic regression module.** Built from scratch rather than pulled from a library, so I could actually understand what the model was doing rather than treat it as a black box. Before starting a task, the user rates their confidence; the model learns whether that rating actually predicts completion, using real logged outcomes as training signal. It's an ongoing, small-sample model by nature — it only gets more useful the longer the app is actually used, which is also its biggest current limitation (see below).

## What's missing

- No long-term view of burnout trends — the system reacts to current state but doesn't yet show the user how their burnout has moved over weeks or months
- The logistic regression model is trained on usage data as it comes in, so early on, with few logged tasks, its predictions are naturally less reliable — this improves over time but isn't solved yet
- No mobile push notifications — the governor's interventions are only visible when the user opens the app
- Scheduling thresholds are currently fixed rather than personalized per user, so what counts as "high burnout" doesn't yet adapt to an individual's baseline

## Running it

```
git clone https://github.com/geek-not-geeks/cognisync_guardian.git
cd cognisync_guardian
npm install
cp .env.example .env   # fill in your own Supabase project keys
npm run dev
```

Live demo: https://cognisync-guardian.akhilesh-samantaray.workers.dev/

