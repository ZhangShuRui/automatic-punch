const puppeteer = require("puppeteer");
const schedule = require("node-schedule");
const moment = require("moment");
enum Punch {
  punchIn,
  punchOut,
}

export async function start(type: Punch = Punch.punchIn) {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ["--disable-features=site-per-process", "--start-maximized"],
    timeout: 30000, // 默认超时为30秒，设置为0则表示不设置超时
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36"
  );

  page.on("dialog", async (dialog) => {
    console.log(dialog.message());
    await dialog.dismiss();
  });

  // page.on('frameattached', (frame) => {
  //   console.log('frameattached --------->', frame.name());
  // });

  await page.goto("http://oa.corp-ci.com/admin.php", {
    waitUntil: "networkidle2", // 等待网络状态为空闲的时候才继续执行
  });

  const usernameInput = await page.waitForSelector('input[name="email"]');
  await usernameInput.type("zhangshurui@corp-ci.com");

  const pwdInput = await page.waitForSelector('input[name="password"]');
  await pwdInput.type("xxxxxxxxxxxxx");

  const loginBtn = await page.waitForSelector('button[type="submit"]');
  await loginBtn.click();

  await page.waitFor(5000);

  const targetFrameUrl = "http://oa.corp-ci.com/oa.php/punch/index?sss=";
  const frame = await page.frames().find((v) => {
    return v.url().includes(targetFrameUrl);
  });

  const punchBtn = await frame.waitForSelector(
    type === Punch.punchIn ? "#sign-box-1" : "#sign-box-4"
  );
  punchBtn.click();
  await page.waitFor(3000);

  try {
    const modal = await frame.waitForSelector(".layui-layer-dialog");
    const tipBtn = await modal.waitForSelector(".layui-layer-btn > a");

    const textList = await modal.$$eval(".layui-layer-content", (nodes) =>
      nodes.map((n) => n.innerText)
    );
    console.log("弹框信息：", textList[0]);

    if (textList[0] === "你已经打过卡了！") {
      tipBtn.click();
    }
  } catch (error) {
    console.log(error);
  }

  // 关闭浏览器
  await browser.close();
}

try {
  const scheduleCronstyle = function () {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1; // 月份从 0 开始，所以需要加 1
    const day = currentDate.getDate();
    const currentDateStr = `${year}-${month}-${day}`;

    schedule.scheduleJob(new Date(currentDateStr + " 9:00:00"), () => {
      console.log("上班打卡:" + new Date());
      start(Punch.punchIn);
    });
    schedule.scheduleJob(new Date(currentDateStr + " 19:00:00"), () => {
      console.log("下班打卡:", new Date());
      start(Punch.punchOut);
    });
  };
  scheduleCronstyle();
} catch (error) {
  console.log("err", error);
}
