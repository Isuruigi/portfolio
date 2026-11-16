import { BookOpen, Github, Linkedin, Twitter, type LucideIcon } from "lucide-react";

// One list of profiles, used by the hero, About, Contact and the footer
export interface Social {
    label: string;
    handle: string;
    href: string;
    icon: LucideIcon;
}

export const socials: Social[] = [
    { label: "LinkedIn", handle: "in/isuruig", href: "https://www.linkedin.com/in/isuruig", icon: Linkedin },
    { label: "GitHub", handle: "Isuruigi", href: "https://github.com/Isuruigi", icon: Github },
    { label: "X", handle: "@Isuru_ig", href: "https://x.com/Isuru_ig", icon: Twitter },
    { label: "Medium", handle: "@isuruig", href: "https://medium.com/@isuruig", icon: BookOpen },
];
