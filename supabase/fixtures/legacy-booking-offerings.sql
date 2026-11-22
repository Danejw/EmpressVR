-- Idempotent source-backed booking catalogue copied from the existing live EmpressVR store.
-- Verified against https://www.empressvr.com/scheduling and https://www.empressvr.com/store on 2026-11-21.
-- This fixture can be run against new environments AFTER applying the booking schema.
-- All three classes were sold out when checked, so public reservations remain disabled.
-- No sessions, capacities or customer bookings are invented.
-- Existing rows are preserved for staff to edit, even on repeat runs.
INSERT INTO public.offerings
  (slug,title,description,kind,price_minor,currency,published,accepting_bookings)
VALUES
  ('intro-to-vrchat-fluency-in-vr', 'Intro to VRChat Fluency --> In VR!', 'This 1 hour class will take place in VRChat and will navigate to several worlds that are educational in nature and is specifically designed to allow you to acclimate to virtual reality gradually which will give your nervous system time to adjust while limiting the risk of motion sickness and allowing you to enjoy your time exploring virtual worlds fearlessly!

Duration: 1 hour. Format: live class in VRChat. Requires a VR headset; Meta Quest or Pico are suitable, with no PC VR-only worlds.

Topics: introductions and motion-sickness tips (10 min); menu basics covering comfort settings, adding friends and avatars (15 min); break (10 min); educational world visit covering world settings, physics, conversations and VR etiquette (15 min); wrap-up (10 min).

Accessibility: Please contact classes@empressvr.com to discuss adjustments. Motion sickness cannot be guaranteed to be avoided. Participants may remove the headset, rest, and return; anyone who misses part of the class due to motion sickness may attend another session.

Sliding-scale pricing and scholarship opportunities are available. Contact classes@empressvr.com.', 'class', 1200, 'GBP', true, false),
  ('immersive-storytelling-principles-in-vrchat', 'Immersive Storytelling Principles -> In VRChat!', 'This 2 hour class will take place in VRChat and will navigate to several worlds that are educational in nature and will demonstrate the principles of immersive storytelling in either very good — or very bad — ways!

Duration: 2 hours. Format: guided class in VRChat, including visits to immersive worlds that illustrate effective and ineffective storytelling techniques.

Prerequisite: comfortable navigation of VRChat and VR generally. Beginners should first take Intro to VRChat Fluency.

Topics: introductions and 3D design basics (15 min); immersive storytelling tour exploring lighting, visual cues, affordances, interaction, terrain, sound, particles, triggers, colliders, scale and respawn mechanics (30 min); break (10 min); first world visit featuring best practices, games and Easter eggs (30 min); second world visit covering flying, multiplayer and human behaviour (30 min); wrap-up (5 min).

Accessibility: VR headset recommended but optional. Participation via 2D PC, phone or tablet is possible. No PC VR-only worlds. Contact classes@empressvr.com for accommodations. Participants can take breaks if needed.

Sliding-scale pricing and scholarship opportunities are available. Contact classes@empressvr.com.', 'class', 4000, 'GBP', true, false),
  ('intro-to-unity-for-meta-quest-vr-development-zoom', 'Intro to Unity for Meta Quest VR Development - Zoom', 'This is a 6 Week Bootcamp-style course with low-to-no coding designed for Creatives and Artists who want to fast-track their ability to prototype immersive VR applications and test ideas in pre-production.

Duration: 6-week bootcamp, taught online via Zoom. Designed for artists and creatives with little or no coding experience who want to prototype VR applications and explore immersive game design.

Preparation (week 0): guided Unity setup with step-by-step instructions and optional one-to-one instructor support.
Week 1: Unity interface, assets and programming concepts.
Week 2: Meta Quest Developer Hub, software development kits, and testing in the headset.
Week 3: Meta Interaction SDK and interactions.
Week 4: VR locomotion and movement.
Week 5: collaborative worldbuilding/prototyping in Gravity Sketch.
Week 6: multiplayer application theory.

Technical equipment and requirements are provided by the course organiser. Optional practical homework accompanies most sessions.

Sliding-scale pricing and scholarship opportunities are available. Contact classes@empressvr.com.', 'class', 40000, 'GBP', true, false)
ON CONFLICT (slug) DO NOTHING;
