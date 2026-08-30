import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { wellnessApi } from '../../api';
import { BarChart, LineChart, PieChart, formatMoney, formatNumber } from '../../components/charts/SimpleCharts';

function MetricCard({ label, today, total, prefix = '', isMoney = false }) {
  const fmt = isMoney ? formatMoney : formatNumber;
  return (
    <div className="metric-card">
      <span className="metric-label">{label}</span>
      <div className="metric-split">
        <div>
          <strong>
            {prefix}
            {fmt(today)}
          </strong>
          <span>Today</span>
        </div>
        <div>
          <strong>
            {prefix}
            {fmt(total)}
          </strong>
          <span>Total</span>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await wellnessApi.getDashboard();
      setData(res.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading && !data) return <div className="page">Loading dashboard...</div>;
  if (error && !data) return <div className="page alert error">{error}</div>;

  const pkg = data?.package_purchases || {};
  const bv = data?.bv_purchasing || {};
  const income = data?.income || {};
  const users = data?.users || {};
  const charts = data?.charts || {};

  return (
    <div className="page dashboard-page">
      <div className="page-head">
        <div>
          <h2>Dashboard</h2>
          <p className="page-sub">
            Packages, BV, income distribution, orders & users — today vs total
          </p>
        </div>
        <button type="button" className="btn" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      {error ? <div className="alert error">{error}</div> : null}

      <section className="metric-grid">
        <MetricCard
          label="Package purchases"
          today={pkg.todayCount}
          total={pkg.totalCount}
        />
        <MetricCard
          label="Package sales amount"
          today={pkg.todayAmount}
          total={pkg.totalAmount}
          prefix="₹"
          isMoney
        />
        <MetricCard
          label="Package BV"
          today={pkg.todayBv}
          total={pkg.totalBv}
          isMoney
        />
        <MetricCard
          label="Total BV purchasing"
          today={bv.todayBv}
          total={bv.totalBv}
          isMoney
        />
        <MetricCard
          label="Income distributed"
          today={income.total?.todayAmount}
          total={income.total?.totalAmount}
          prefix="₹"
          isMoney
        />
        <MetricCard
          label="Users joined / active"
          today={users.todayJoined}
          total={users.total}
        />
      </section>

      <section className="panel pkg-sales-panel">
        <div className="panel-head-row">
          <div>
            <h3>Sales by package</h3>
            <p className="page-sub" style={{ margin: 0 }}>
              Each package — today and total sales
            </p>
          </div>
        </div>

        {(pkg.by_package || []).length === 0 ? (
          <p className="muted">No packages found.</p>
        ) : (
          <>
            <div className="pkg-sales-summary">
              <div className="pkg-sales-summary-item">
                <span>Today</span>
                <strong>₹{formatMoney(pkg.todayAmount)}</strong>
                <em>{formatNumber(pkg.todayCount)} sold</em>
              </div>
              <div className="pkg-sales-summary-item pkg-sales-summary-total">
                <span>All-time total</span>
                <strong>₹{formatMoney(pkg.totalAmount)}</strong>
                <em>{formatNumber(pkg.totalCount)} sold</em>
              </div>
              <div className="pkg-sales-summary-item">
                <span>Packages</span>
                <strong>{formatNumber((pkg.by_package || []).length)}</strong>
                <em>in catalog</em>
              </div>
            </div>

            <div className="pkg-sales-list">
              <div className="pkg-sales-list-head">
                <span>Package</span>
                <span>Today</span>
                <span>Total</span>
                <span>Share</span>
              </div>
              {(pkg.by_package || []).map((item) => {
                const share =
                  Number(pkg.totalAmount) > 0
                    ? Math.min(100, (Number(item.totalAmount) / Number(pkg.totalAmount)) * 100)
                    : 0;
                return (
                  <div key={item.packageId} className="pkg-sales-row">
                    <div className="pkg-sales-name">
                      <span className="pkg-sales-id">#{item.packageId}</span>
                      <strong>{item.name}</strong>
                    </div>
                    <div className="pkg-sales-stat">
                      <strong>₹{formatMoney(item.todayAmount)}</strong>
                      <span>{formatNumber(item.todayCount)} sold</span>
                    </div>
                    <div className="pkg-sales-stat">
                      <strong>₹{formatMoney(item.totalAmount)}</strong>
                      <span>{formatNumber(item.totalCount)} sold</span>
                    </div>
                    <div className="pkg-sales-share">
                      <div className="pkg-sales-bar" aria-hidden>
                        <i style={{ width: `${share}%` }} />
                      </div>
                      <span>{share.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      <section className="panel income-breakdown">
        <div className="panel-head-row">
          <div>
            <h3>Income by type</h3>
            <p className="page-sub" style={{ margin: 0 }}>
              Which incomes were paid — today and total
            </p>
          </div>
          <Link className="stat-link" to="/payout-report">
            Full payout report →
          </Link>
        </div>
        <div className="income-type-grid">
          {(income.by_type || []).length === 0 ? (
            <p className="muted">No income types configured.</p>
          ) : (
            (income.by_type || []).map((item) => (
              <div key={item.slug} className="income-type-card">
                <h4>{item.name}</h4>
                <div className="metric-split">
                  <div>
                    <strong>₹{formatMoney(item.todayAmount)}</strong>
                    <span>Today</span>
                  </div>
                  <div>
                    <strong>₹{formatMoney(item.totalAmount)}</strong>
                    <span>Total</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="dashboard-charts">
        <div className="panel chart-panel">
          <h3>Income distribution</h3>
          <p className="page-sub" style={{ marginTop: '-0.35rem' }}>
            Share of total income by type
          </p>
          <PieChart data={charts.income_pie || []} innerLabel="Income" />
        </div>

        <div className="panel chart-panel">
          <h3>Users status</h3>
          <p className="page-sub" style={{ marginTop: '-0.35rem' }}>
            Active vs inactive distributors
          </p>
          <PieChart data={charts.users_pie || []} innerLabel="Users" />
          <div className="user-quick-stats">
            <div>
              <strong>{formatNumber(users.todayJoined)}</strong>
              <span>Joined today</span>
            </div>
            <div>
              <strong>{formatNumber(users.todayActivated)}</strong>
              <span>Activated today</span>
            </div>
            <div>
              <strong>{formatNumber(users.active)}</strong>
              <span>Active now</span>
            </div>
          </div>
        </div>

        <div className="panel chart-panel">
          <h3>Orders by type</h3>
          <p className="page-sub" style={{ marginTop: '-0.35rem' }}>
            Count of valid orders by channel
          </p>
          <PieChart data={charts.order_type_pie || []} innerLabel="Orders" />
        </div>
      </section>

      <section className="dashboard-graphs">
        <div className="panel chart-panel">
          <h3>Orders graph</h3>
          <p className="page-sub" style={{ marginTop: '-0.35rem' }}>
            Last {charts.days || 14} days — order count
          </p>
          <BarChart
            data={charts.orders || []}
            series={[{ key: 'orders', label: 'Orders', color: '#0d9488' }]}
          />
          <p className="page-sub" style={{ marginTop: '0.85rem' }}>
            Sales amount (₹)
          </p>
          <LineChart
            data={charts.orders || []}
            series={[{ key: 'amount', label: 'Amount (₹)', color: '#2563eb', area: true }]}
            valuePrefix="₹"
            formatValue={(v) =>
              Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(1)}k` : formatMoney(v)
            }
          />
        </div>

        <div className="panel chart-panel">
          <h3>Income graph</h3>
          <p className="page-sub" style={{ marginTop: '-0.35rem' }}>
            Last {charts.days || 14} days — income credited
          </p>
          <LineChart
            data={charts.income || []}
            series={[{ key: 'amount', label: 'Income (₹)', color: '#8b5cf6', area: true }]}
            valuePrefix="₹"
            formatValue={(v) =>
              Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(1)}k` : formatMoney(v)
            }
          />
        </div>

        <div className="panel chart-panel chart-panel-wide">
          <h3>Users graph</h3>
          <p className="page-sub" style={{ marginTop: '-0.35rem' }}>
            Last {charts.days || 14} days — new joins vs activations
          </p>
          <BarChart
            data={charts.users || []}
            series={[
              { key: 'joined', label: 'Joined', color: '#0d9488' },
              { key: 'activated', label: 'Activated', color: '#f59e0b' },
            ]}
          />
        </div>
      </section>

      <section className="stat-grid overview-strip">
        {[
          { label: 'Franchises', value: data?.franchises ?? 0 },
          { label: 'Distributors', value: data?.distributors ?? 0 },
          { label: 'Theme users', value: data?.theme_users ?? 0 },
          { label: 'Catalog packages', value: data?.packages ?? 0 },
          { label: 'Products', value: data?.products ?? 0 },
          { label: 'All orders', value: data?.orders ?? 0 },
          { label: 'Pending orders', value: data?.pending_orders ?? 0, to: '/orders/franchise' },
          { label: 'Revenue', value: `₹${formatMoney(data?.revenue)}` },
        ].map((card) => (
          <div key={card.label} className="stat-card">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            {card.to ? (
              <Link className="stat-link" to={card.to}>
                View
              </Link>
            ) : null}
          </div>
        ))}
      </section>

      <div className="detail-grid">
        <section className="panel">
          <h3>Low stock products</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>SKU</th>
                  <th>Stock</th>
                </tr>
              </thead>
              <tbody>
                {(data?.low_stock_products || []).length === 0 ? (
                  <tr>
                    <td colSpan={3}>None</td>
                  </tr>
                ) : (
                  (data?.low_stock_products || []).map((p) => (
                    <tr key={p.productId}>
                      <td>{p.product_name}</td>
                      <td>{p.sku}</td>
                      <td>{p.stock}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel">
          <h3>Out of stock products</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>SKU</th>
                  <th>Stock</th>
                </tr>
              </thead>
              <tbody>
                {(data?.out_of_stock_products || []).length === 0 ? (
                  <tr>
                    <td colSpan={3}>None</td>
                  </tr>
                ) : (
                  (data?.out_of_stock_products || []).map((p) => (
                    <tr key={p.productId}>
                      <td>{p.product_name}</td>
                      <td>{p.sku}</td>
                      <td>{p.stock}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
