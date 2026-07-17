import { useEffect, useState } from 'react';
import { franchiseApi } from '../../api';

export default function Notifications() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await franchiseApi.getNotifications({ page: 1, limit: 50 });
        if (active) setList(res.data?.data || []);
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Failed to load notifications');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="page">
      <h2>Notifications</h2>
      {error ? <div className="alert error">{error}</div> : null}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Message</th>
                <th>Read</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={4}>No notifications</td>
                </tr>
              ) : (
                list.map((item) => (
                  <tr key={item._id}>
                    <td>{item.title || '-'}</td>
                    <td>{item.message || item.body || '-'}</td>
                    <td>{item.is_read ? 'Yes' : 'No'}</td>
                    <td>
                      {item.created_date
                        ? new Date(item.created_date).toLocaleString()
                        : item.createdAt
                          ? new Date(item.createdAt).toLocaleString()
                          : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
