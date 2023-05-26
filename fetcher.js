

async function getFile(url) {
  const response = await fetch(url);
  const contentType = response.headers.get("content-type");
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  let file;
  if (contentType?.includes("text") || contentType?.includes("json")) {
    file = await response.text();
  } else if (contentType?.includes("html")) {
    file = await response.text();
  } else {
    file = await response.arrayBuffer();
  }
  return { file, contentType };
}

function prependBaseUrlToCSS(css, baseUrl) {
  const urlRegex = /url\((['"]?)([^'")]+)(['"]?)\)/g;
  const replacedCSS = css.replace(urlRegex, (_match, p1, p2, p3) => {
    const url = p2.trim();
    const absoluteUrl = "/api/fetcher?url=" + new URL(url, baseUrl).href;
    return `url(${p1}${absoluteUrl}${p3})`;
  });

  return replacedCSS;
}

import express from "express";

export let fetcherRouter = express.Router();

fetcherRouter.get("/", async (req, res) => {
  const params = new URL(req.url, "http://localhost").searchParams;
  let url = params.get("url");

  if (!url) {
    return new Response("Incomplete parameters", { status: 400 });
  }

  console.log(`url: ${url}`);
  let { file, contentType } = await getFile(url);

  if (contentType?.includes("css")) {
    let baseUrl = new URL(url).origin;
    // return new Response(prependBaseUrlToCSS(file, baseUrl), {
    //   headers: {
    //     "Content-Type": contentType,
    //   },
    // });
    res.set("Content-Type", contentType);
    res.send(prependBaseUrlToCSS(file, baseUrl),);
  } else {
    // return new Response(file, {
    //   headers: {
    //     "Content-Type": contentType,
    //   },
    // });
    res.set("Content-Type", contentType);
    res.send(file);
  }
})
