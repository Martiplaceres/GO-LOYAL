import { useSelector } from "react-redux";
import { useState } from "react";
import { useHistory } from "react-router";
import { selectToken, selectUser } from "../store/user/selectors";
import axios from "axios";
import QRCode from "react-qr-code";

export default function QRCodePage() {
  const token = useSelector(selectToken);
  const history = useHistory();
  const user = useSelector(selectUser);
  const [bean, setBean] = useState("1");
  const [quantity, setQuantity] = useState(0);
  const [qrCodeValue, setQrCodeValue] = useState(null);

  console.log(JSON.stringify(user));

  async function onSubmitForm(event) {
    event.preventDefault();

    try {
      const response = await axios.get(
        `/api/store/qr?storeuser=${user.store.id}&quantity=${quantity}&bean=${bean}`
      );
      console.log(response.data.qrCodeUrl);
      setQrCodeValue(response.data.qrCodeUrl);
    } catch (e) {
      console.log(e);
    }
  }

  return (
    <div>
      <div className="backgroundPages"></div>
      <div className="animation">
        <h1 className="vouchersCardTitle">Generate QR code:</h1>
        <div className="QRform">
          <label for="beans">Coffee bean:</label>
          <select
            style={{ width: "30%" }}
            value={bean}
            onChange={(e) => setBean(e.target.value)}
            name="beans"
            id="beans"
            form="beanform"
          >
            <option value="1">Brazil</option>
            <option value="2">Peru</option>
            <option value="3">Costa Rica</option>
            <option value="4">Uganda</option>
            <option value="5">Colombia</option>
          </select>

          <label for="quantity">Quantity (between 1 and 5):</label>
          <input
            style={{ width: "30%" }}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            type="number"
            id="quantity"
            name="quantity"
            min="1"
            max="5"
          ></input>

          <button
            style={{ marginTop: 20 }}
            type="button"
            class="btn btn-dark"
            onClick={onSubmitForm}
          >
            Generate QR code
          </button>
          <div>
            <div style={{ marginTop: 50 }}>
              {qrCodeValue && <QRCode value={qrCodeValue} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
