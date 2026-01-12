export const NotificationPlugin = async ({ $ }) => {
  return {
    event: async ({ event }) => {
      // Send notification on session completion
      if (event.type === "session.idle") {
        const title = "OpenCode";
        const message = "任务已完成";

        // 使用插值将命令组合好
        const psCommand = `New-BurntToastNotification -Text "${title}", "${message}"`;

        await $`powershell -Command ${psCommand}`;
      }
    },
  };
};
