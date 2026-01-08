import { useState, useEffect } from "react";

type TranslationService = "google" | "microsoft" | "tencent";

interface ServiceConfig {
  id: TranslationService;
  name: string;
  description: string;
}

const services: ServiceConfig[] = [
  { id: "google", name: "Google", description: "谷歌翻译服务" },
  { id: "microsoft", name: "Microsoft", description: "微软翻译服务" },
  { id: "tencent", name: "Tencent", description: "腾讯翻译服务" },
];

function App() {
  const [selectedService, setSelectedService] = useState<TranslationService>("google");

  useEffect(() => {
    browser.storage.local.get("selectedService").then((result) => {
      if (result.selectedService) {
        setSelectedService(result.selectedService as TranslationService);
      }
    });
  }, []);

  const selectService = async (serviceId: TranslationService) => {
    setSelectedService(serviceId);
    await browser.storage.local.set({ selectedService: serviceId });
  };

  return (
    <div className="card w-100 min-h-96 bg-linear-to-br from-primary to-secondary text-primary-content shadow-xl">
      <div className="card-body p-4">
        <div className="text-center pb-3 border-b border-white/20">
          <h2 className="card-title text-xl justify-center mb-1">翻译插件设置</h2>
          <p className="text-xs opacity-90">选择翻译服务</p>
        </div>

        <div className="form-control gap-2">
          {services.map((service) => {
            const isSelected = selectedService === service.id;

            return (
              <div
                key={service.id}
                className={`
                  card bg-base-200 hover:bg-base-300 cursor-pointer transition-all
                  ${isSelected ? "border-2 border-primary shadow-md" : "border-2 border-transparent"}
                `}
                onClick={() => selectService(service.id)}
              >
                <div className="card-body p-3 flex-row gap-2 items-center">
                  <label className="label cursor-pointer flex-1">
                    <span className="label-text font-semibold text-sm">{service.name}</span>
                  </label>
                  <input
                    type="radio"
                    name="service"
                    className="radio radio-primary radio-sm"
                    checked={isSelected}
                    onChange={() => selectService(service.id)}
                  />
                </div>
                <p className="text-[0.625rem] px-3 pb-2 opacity-85">{service.description}</p>
              </div>
            );
          })}
        </div>

        <div className="alert alert-info alert-sm mt-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="stroke-current shrink-0 w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12 a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          <div>
            <div className="text-[0.625rem]">
              点击选择一个翻译服务，如果当前服务不可用，请尝试切换到其他服务
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
