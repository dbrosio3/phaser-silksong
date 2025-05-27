import { useRef } from "react";
import { IRefPhaserGame, PhaserGame, ICustomScene } from "./PhaserGame";

function App() {
  //  Reference to the PhaserGame component (game and scene are exposed)
  const phaserRef = useRef<IRefPhaserGame | null>(null);

  const changeScene = () => {
    if (phaserRef.current) {
      const scene: ICustomScene | undefined = phaserRef.current.scene;

      if (scene && scene.changeScene) {
        scene.changeScene();
      }
    }
  };

  return (
    <div id="app">
      <PhaserGame ref={phaserRef} />
      <div>
        <div>
          <button className="button" onClick={changeScene}>
            Change Scene
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
