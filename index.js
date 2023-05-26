
import { load } from "cheerio"
import express from "express"
import cors from "cors"
import { fetcherRouter } from "./fetcher.js"

const app = express()
app.use(cors())

app.get("/", async (req, res) => {
  const params = new URL(req.url, "http://localhost").searchParams
  let url = params.get("url")

  if (!url) {
    res.status(400).send("No url")
    return
  }

  // get raw html from url
  try {
    let html = await getHTML(url)
    let baseUrl = new URL(url).origin

    res.send(processHtml(html, baseUrl))
  } catch (e) {
    console.log(e)
    res.status(400).send(`Error fetching url\n${e.toString()}`)
  }
})

app.use("/api/fetcher", fetcherRouter)

async function getHTML(url) {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(response.statusText)
  }

  const html = await response.text()
  return html

}


function processHtml(htmlText, baseUrl) {
  const dom = load(htmlText);
  const tags = {
    img: "src",
    link: "href",
    script: "src",
    source: "src",
    video: "src",
    audio: "src",
  };

  for (const [tag, attr] of Object.entries(tags)) {
    dom(tag).each((_, el) => {
      const $el = dom(el);
      const url = $el.attr(attr);
      if (url && !url.startsWith("http")) {
        $el.attr(attr, new URL(url, baseUrl).toString());
      }
      if (
        tag === "link" &&
        ($el.attr("rel") === "stylesheet" || $el.attr("type")?.includes("font"))
      ) {
        $el.attr(
          "href",
          (
            "/api/fetcher?url=" +
            `${url.startsWith("http") ? "" : baseUrl}` +
            url
          ).toString()
        );
      }
    });
  }

  dom("head").prepend(customScript(baseUrl));

  return dom.html();
}


const customScript = (baseUrl) => {
  // return `<script>(function(){const dom=document.querySelector("html");const tags={"a":"href","img":"src","link":"href","script":"src","source":"src","video":"src","audio":"src"};function hydrate(dom,tags){for(const[tag,attr]of Object.entries(tags)){dom.querySelectorAll(tag).forEach((el)=>{const url=el.getAttribute(attr);if(url&&!url.startsWith("http")){el.setAttribute(attr,new URL(url,"${baseUrl}").toString())}})}}hydrate(dom,tags);setInterval(()=>{hydrate(dom,tags)},1000)})();</script>`
  return ` <script>
     (function() {
       let baseUrl = "${baseUrl}";

       const dom = document.querySelector("html");
       const tags = {
         "img": ["src", "srcset"],
         "script": ["src"],
         "source": ["src"],
         "video": ["src"],
         "audio": ["src"]
       };

       function hydrate(dom, tags) {
         for (const [tag,
             attrs
           ] of Object.entries(tags)) {
           dom
             .querySelectorAll(tag)
             .forEach((el) => {
               for (const attr of attrs) {
                 if (attr == 'srcset') {
                   const srcset = el.getAttribute(attr);
                   if (srcset) {
                     const newSrcset = srcset
                       .split(",")
                       .map((src) => {
                         const [url, size] = src.trim().split(" ");
                         if (url && !url.startsWith("http")) {
                           return new URL(url, baseUrl).toString() + " " + size;
                         }
                         return src;
                       })
                       .join(",");
                     el.setAttribute(attr, newSrcset);
                   }
                   continue;
                 }
                 const url = el.getAttribute(attr);
                 if (url && !url.startsWith("http")) {
                   el.setAttribute(attr, new URL(url, baseUrl).toString())
                 }
               }
             })
         }
       }
     })()


     // if the website is react based, we need to change the window location to base url
     // window.history.pushState({}, "", "/");

   </script>`;
};


app.listen(3005, () => {
  console.log("Server running on port 3005")
})
