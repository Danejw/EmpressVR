import { expect, test } from "@playwright/test";

test("About renders real contact fields without archived fake buttons", async ({page}) => {
  await page.goto("/about");
  await expect(page.getByRole("textbox", {name: /First name/i})).toBeVisible();
  await expect(page.getByRole("textbox", {name: /Last name/i})).toBeVisible();
  await expect(page.getByRole("textbox", {name: /^Email/i})).toBeVisible();
  await expect(page.getByRole("button", {name: "Send message"})).toBeEnabled();
  await expect(page.getByText("SendSend")).toHaveCount(0);
});

test("Fundraiser and TechAlchemy expose honest actions instead of inert donation text", async ({page}) => {
  await page.goto("/fun-raiser");
  await expect(page.getByText("DonateDonate")).toHaveCount(0);
  await expect(page.getByRole("link", {name: "Donate on the current EmpressVR site"}))
    .toHaveAttribute("href", "https://www.empressvr.com/fun-raiser");
  await page.goto("/techalchemy26");
  await expect(page.getByText("DonateDonate")).toHaveCount(0);
  await expect(page.getByRole("link", {name: "Ask about TechAlchemy tickets"}))
    .toHaveAttribute("href", /^mailto:info@empressvr.com/);
});

for (const [route,count] of [["/projects-digital-2d-art",9],["/projects-metalwork",3]] as const) {
  test(route + " shows every original artwork image", async ({page}) => {
    await page.goto(route);
    const gallery = page.locator(".content-gallery img");
    await expect(gallery).toHaveCount(count);
    const urls = await gallery.evaluateAll(images => images.map(image => image.getAttribute("src")));
    expect(new Set(urls).size).toBe(count);
    await expect(gallery.first()).toHaveJSProperty("complete", true);
  });
}

test("Community and Education have no duplicated scraped headings", async ({page}) => {
  await page.goto("/community");
  await expect(page.getByRole("heading", {name: "Amplifying Diverse Voices", exact: true})).toHaveCount(1);
  await expect(page.getByText("Item 1 of 6")).toHaveCount(0);
  await page.goto("/education");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.getByRole("link", {name: "Schedule an appointment"})).toHaveAttribute("href","/scheduling");
});

test("Store details use one description and the category never contradicts results", async ({page}) => {
  await page.goto("/store/p/fox-mask-stl-file-for-3d-printing");
  await expect(page.locator(".product-gallery img")).toHaveCount(5);
  await expect(page.getByText(/This fox mask was created/)).toHaveCount(1);
  await page.goto("/store/masks");
  await expect(page.getByText("1 result")).toBeVisible();
  await expect(page.getByText("No results found.")).toHaveCount(0);
});

test("Eirian profile is reachable from Who We Are", async ({page}) => {
  await page.goto("/who-we-are");
  const card = page.locator(".member-card").filter({has:page.getByRole("heading",{name:"Eirian Soar"})});
  await expect(card.getByRole("link",{name:"Learn More"}))
    .toHaveAttribute("href","https://www.linkedin.com/in/eiriansoar/");
});
