import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, Bell, KanbanSquare, ListChecks, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import "./App.css";

gsap.registerPlugin(ScrollTrigger);

export default function App() {
  const scope = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".landing-word", {
        y: 42,
        opacity: 0,
        duration: 0.8,
        stagger: 0.06,
        ease: "power4.out"
      });

      gsap.to(".floating-card", {
        y: -18,
        duration: 2.6,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
        stagger: 0.18
      });

      gsap.from(".scroll-reveal", {
        scrollTrigger: {
          trigger: ".landing-features",
          start: "top 78%"
        },
        y: 30,
        opacity: 0,
        duration: 0.7,
        stagger: 0.08,
        ease: "power3.out"
      });
    }, scope);

    return () => ctx.revert();
  }, []);

  return (
    <main ref={scope} className="landing-page">
      <section className="landing-hero">
        <nav>
          <div className="sidebar-brand">
            <div className="brand-dot"><ListChecks size={22} /></div>
            <strong>Team Task Manager</strong>
          </div>
          <Link to="/login" className="secondary-button">Login</Link>
        </nav>

        <div className="landing-copy">
          <p className="eyebrow landing-word">Apple/Linear-inspired team operations</p>
          <h1>
            {"Team Task Manager".split(" ").map((word) => (
              <span key={word} className="landing-word">{word} </span>
            ))}
          </h1>
          <p className="landing-word">
            Secure authentication, role-aware projects, advanced Kanban tasks, Jira-style
            timelines, live notifications, premium theming, and subtle GSAP motion.
          </p>
          <div className="landing-actions landing-word">
            <Link to="/signup" className="primary-button">
              Start workspace
              <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="secondary-button">
              Open dashboard
            </Link>
          </div>
        </div>

        <div className="landing-board">
          <article className="floating-card card-a">
            <KanbanSquare size={22} />
            <strong>Review</strong>
            <span>Rahul moved task to Review</span>
          </article>
          <article className="floating-card card-b">
            <Bell size={22} />
            <strong>Due soon</strong>
            <span>Mobile QA closes tomorrow</span>
          </article>
          <article className="floating-card card-c">
            <UsersRound size={22} />
            <strong>Team</strong>
            <span>Admin invited Priya</span>
          </article>
        </div>
      </section>

      <section className="landing-features">
        {[
          ["Secure auth", "Signup, login, logout, email verification, reset password, sessions.", ShieldCheck],
          ["Advanced tasks", "Labels, comments, subtasks, checklist, blockers, recurring work.", KanbanSquare],
          ["Live signal", "Grouped activity, timestamps, avatars, filters, and notifications.", Sparkles]
        ].map(([title, text, Icon]) => (
          <article key={title} className="scroll-reveal">
            <Icon size={24} />
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
