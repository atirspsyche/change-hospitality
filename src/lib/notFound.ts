export function getNotFoundContent(pathname: string) {
  const isJob = /^\/jobs?\/[^/]+\/?$/.test(pathname);

  return isJob
    ? {
      title: "This one's off the menu.",
      description: "This role may have been filled or is no longer available. There are more good things on the pass.",
      href: "/jobs/",
      label: "Explore jobs",
      note: "Your next chapter is still out there.",
    }
    : {
      title: "A little off the beaten egg.",
      description: "We couldn't find the page you were looking for. Let's get you back to the good stuff.",
      href: "/",
      label: "Back to home",
      note: "A wrong turn. Not a bad start.",
    };
}
