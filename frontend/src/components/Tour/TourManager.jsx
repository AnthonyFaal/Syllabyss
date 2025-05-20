import Joyride from "react-joyride";

const TourManager = ({ steps, run, callback }) => {
  return (
    <Joyride
      steps={steps}
      run={run}
      continuous={true}
      showSkipButton={true}
      showProgress={true}
      styles={{
        options: {
          zIndex: 10000,
          primaryColor: "#1976d2",
          textColor: "#333",
          arrowColor: "#1976d2",
        },
      }}
      callback={callback}
      locale={{
        back: "Back",
        close: "Close",
        last: "Done",
        next: "Next",
        skip: "Skip",
      }}
    />
  );
};

export default TourManager;
