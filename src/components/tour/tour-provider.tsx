"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { driver, type Driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { useTranslations } from "next-intl";

import {
  dismissTour,
  finishTour,
  getTourForPath,
  shouldShowTour,
  TOUR_TOGGLE_EVENT,
  type TourDefinition,
  type TourToggleDetail,
} from "@/lib/tours";

/** Pages fetch data before their targets render. */
const START_DELAY_MS = 900;

/** A target that exists and is on screen (not inside a closed menu or a hidden breakpoint). */
const visibleTarget = (name: string) => {
  const el = document.querySelector<HTMLElement>(`[data-tour="${name}"]`);
  return el && el.getClientRects().length > 0 ? el : null;
};

/**
 * Runs the current page's tour. Renders nothing; mounted once in the app
 * shell so it sees every page. Steps whose target isn't on the page are
 * dropped, so a missing element never highlights an empty area.
 */
export function TourProvider() {
  const t = useTranslations("tour");
  // Step keys come from the tour registry, so they are typed as plain strings.
  const msg = React.useCallback((key: string) => t(key as Parameters<typeof t>[0]), [t]);
  const pathname = usePathname();
  const instance = React.useRef<Driver | null>(null);

  const stop = React.useCallback(() => {
    const current = instance.current;
    instance.current = null;
    if (current?.isActive()) current.destroy();
  }, []);

  const start = React.useCallback(
    (tour: TourDefinition) => {
      stop();
      const steps: DriveStep[] = tour.steps.flatMap((step) => {
        const element = visibleTarget(step.target);
        if (!element) return [];
        return [
          {
            element,
            popover: {
              title: msg(`${tour.id}.${step.key}.title`),
              description: msg(`${tour.id}.${step.key}.body`),
              side: step.side,
              align: "start",
            },
          },
        ];
      });
      if (steps.length === 0) return;

      const run = driver({
        steps,
        showProgress: true,
        // driver.js fills in its own {{current}} and {{total}}.
        progressText: t("progress", { current: "{{current}}", total: "{{total}}" }),
        nextBtnText: t("next"),
        prevBtnText: t("back"),
        doneBtnText: t("done"),
        popoverClass: "rankoya-tour",
        overlayColor: "#000",
        overlayOpacity: 0.68,
        stagePadding: 6,
        stageRadius: 10,
        smoothScroll: true,
        onPopoverRender: (popover) => {
          const close = document.createElement("button");
          close.type = "button";
          close.className = "rankoya-tour-close";
          close.textContent = t("close");
          close.addEventListener("click", () => run.destroy());
          popover.footerButtons.prepend(close);
        },
        onDestroyStarted: () => {
          const finished = !run.hasNextStep();
          // Destroy first: finish/dismiss emit the toggle event, which would
          // otherwise try to stop this instance again mid-teardown.
          instance.current = null;
          run.destroy();
          if (finished) finishTour(tour.id);
          else dismissTour(tour.id);
        },
      });
      instance.current = run;
      run.drive();
    },
    [stop, t, msg],
  );

  // A new page: stop the old tour, then start this page's if it should show.
  React.useEffect(() => {
    stop();
    const tour = getTourForPath(pathname);
    if (!tour || !shouldShowTour(tour.id)) return;
    const timer = window.setTimeout(() => start(tour), START_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [pathname, start, stop]);

  // The profile menu's switch.
  React.useEffect(() => {
    const onToggle = (event: Event) => {
      const { action } = (event as CustomEvent<TourToggleDetail>).detail;
      const tour = getTourForPath(pathname);
      if (action === "start" && tour) start(tour);
      else stop();
    };
    window.addEventListener(TOUR_TOGGLE_EVENT, onToggle);
    return () => window.removeEventListener(TOUR_TOGGLE_EVENT, onToggle);
  }, [pathname, start, stop]);

  React.useEffect(() => stop, [stop]);

  return null;
}
