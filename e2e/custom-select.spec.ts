import {expect,test} from "@playwright/test";

test("shared dropdown works with mouse and keyboard on the public membership form",async({page})=>{
  await page.goto("/membership");
  const select=page.getByRole("combobox",{name:"How did you hear about us?"});
  await expect(select).toBeVisible();
  await select.click();
  const list=page.getByRole("listbox",{name:"How did you hear about us?"});
  await expect(list).toBeVisible();
  await expect(list.getByRole("option",{name:"A friend in the community"})).toBeVisible();
  await list.getByRole("option",{name:"EmpressVR website"}).click();
  await expect(select).toContainText("EmpressVR website");
  await expect(list).toBeHidden();
  await select.focus();
  await select.press("ArrowDown");
  await expect(list).toBeVisible();
  await select.press("Escape");
  await expect(list).toBeHidden();
});

test("custom dropdown stays inside phone viewport",async({page})=>{
  await page.setViewportSize({width:375,height:812});
  await page.goto("/membership");
  const select=page.getByRole("combobox",{name:"How did you hear about us?"});
  await select.click();
  await expect(page.getByRole("listbox",{name:"How did you hear about us?"})).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(2);
});
