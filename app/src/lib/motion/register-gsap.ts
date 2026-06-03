"use client";

import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Flip } from "gsap/Flip";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;

export function registerGSAP() {
  if (registered) return;

  gsap.registerPlugin(useGSAP, ScrollTrigger, Flip);
  ScrollTrigger.defaults({ markers: false });
  registered = true;
}

export { Flip, ScrollTrigger, gsap };

