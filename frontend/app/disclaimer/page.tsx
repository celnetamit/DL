import LegalPageLayout from "@/components/LegalPageLayout";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Disclaimer | Digital Library",
  description: "Legal disclaimers regarding our content, platform, and liability.",
};

export default function Disclaimer() {
  const sections = [
    { id: "intro", title: "1. About Using This Website" },
    { id: "warranties", title: "2. Warranties and Liability" },
    { id: "exceptions", title: "3. Exceptions" },
    { id: "licence", title: "4. Licence to Use" },
    { id: "links", title: "5. External Links" },
    { id: "law", title: "6. Law and Jurisdiction" },
  ];

  return (
    <LegalPageLayout
      title="Disclaimer"
      lastUpdated="March 20, 2026"
      sections={sections}
    >
      <section id="intro">
        <h2>1. About Using This Website</h2>
        <p>
          By using this website, you are accepting all the terms of this disclaimer notice. If you do not agree with anything in this notice, you should not use this website.
        </p>
        <p>
          <strong>Aether Digital Library</strong> strictly adheres to publication ethics and condemns any kind of deliberate and malicious intention of outraging personal or national feelings. Any content which exhibits blasphemy or attempts to insult religious or political beliefs will not be accepted.
        </p>
      </section>

      <section id="warranties">
        <h2>2. Warranties and Liability</h2>
        <p>
          While every effort is made to ensure that the content of this website is accurate, the website is provided <strong>“as is”</strong> and Aether LMS makes no representations or warranties in relation to the accuracy or completeness of the information found on it.
        </p>
        <p>
          We do not warrant that the servers that make this website available will be error, virus, or bug-free. It is your responsibility to make adequate provision for protection against such threats. We recommend scanning any files before downloading.
        </p>
        <p>
          In no event will Aether Digital Library be liable for any incidental, indirect, consequential, or special damages, including loss of profit, data, or business relationships, arising out of or in connection with the use of this website.
        </p>
      </section>

      <section id="exceptions">
        <h2>3. Exceptions</h2>
        <p>
          Nothing in this disclaimer notice excludes or limits any warranty implied by law for death, fraud, or personal injury through negligence, which would be unlawful to exclude.
        </p>
      </section>

      <section id="licence">
        <h2>4. Licence to Use</h2>
        <p>
          Material on this website, including text and images, is protected by copyright law and is owned by Aether Digital Library unless credited otherwise. It may not be copied, reproduced, or transmitted in any way except for your own personal, non-commercial use.
        </p>
        <p>
          Prior written consent of the copyright holder must be obtained for any other use of material. No part of this site may be distributed or copied for any commercial purpose or financial gain.
        </p>
      </section>

      <section id="links">
        <h2>5. External Links</h2>
        <p>
          Links to other websites are provided for the convenience of users. We are unable to provide any warranty regarding the accuracy or completeness of the content of such sites. A link to an external site does not imply an endorsement of the views, information, or products provided by such websites.
        </p>
      </section>

      <section id="law">
        <h2>6. Law and Jurisdiction</h2>
        <p>
          This disclaimer notice shall be interpreted and governed by Indian law, and any disputes in relation to it are subject to the exclusive jurisdiction of the courts in Delhi/Noida.
        </p>
      </section>
    </LegalPageLayout>
  );
}
