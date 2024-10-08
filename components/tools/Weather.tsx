import React from 'react';
import { WiDaySunny, WiCloudy, WiRain, WiSnow } from 'react-icons/wi';

interface WeatherDataItem {
  time: string;
  temperature: number;
}

const getWeatherIcon = (temperature: number) => {
  // mock icons for now
  if (temperature >= 25) {
    return <WiDaySunny className="weather-icon text-2xl text-yellow-500" />;
  } else if (temperature >= 10) {
    return <WiCloudy className="weather-icon text-2xl text-yellow-500" />;
  } else if (temperature >= 0) {
    return <WiRain className="weather-icon text-2xl text-yellow-500" />;
  } else {
    return <WiSnow className="weather-icon text-2xl text-yellow-500" />;
  }
};

const formatTime = (time: string) => {
  const date = new Date(time);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  const formattedHours = hours % 12 || 12;
  const formattedMinutes = minutes.toString().padStart(2, '0');
  const formattedTime = `${formattedHours}:${formattedMinutes}${ampm}`;
  return formattedTime;
};

interface WeatherDataProps {
  data: WeatherDataItem[];
}

export const WeatherData: React.FC<WeatherDataProps> = ({ data }) => {
  const currentTime = new Date();
  const currentHour = currentTime.getHours();

  // Find the index of the current hour in the data array
  const currentIndex = data.findIndex((item) => {
    const itemTime = new Date(item.time);
    return itemTime.getHours() === currentHour;
  });

  // Slice the data array starting from the current index
  const slicedData = data.slice(currentIndex);

  return (
    <div className="text-shadow-yellow-500 mx-5 text-center text-xl text-yellow-500">
      <div className="flex max-w-[283px] items-center overflow-x-clip whitespace-nowrap rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 p-2">
        {slicedData.map((item, index) => (
          <div key={index} className="mr-4 flex flex-col items-center">
            <div className="text-sm font-bold text-white">{formatTime(item.time)}</div>
            <div className="text-lg font-bold text-white">{getWeatherIcon(item.temperature)}</div>
            <div className="text-sm font-bold text-white">{item.temperature}°C</div>
          </div>
        ))}
      </div>
    </div>
  );
};
